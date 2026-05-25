# GuardMate Platform — Audit Report

## 1. AI Job Matching — Guards Only ✅

**Confirmed: AI matching is exclusively for guards (MATE role), NOT for bosses.**

### Evidence

**Backend guard (`src/app/api/jobs/ai-match/route.ts:22-23`):**
```ts
if (user.role !== UserRole.MATE) {
  return createApiResponse(false, null, 'Only guard mates can use AI matching.', 403);
}
```

**Frontend caller (`src/app/dashboard/mate/jobs/page.tsx:7,53`):**
```ts
import { getAIMatchedJobs } from '@/lib/api/job.api';
// ...
const resp = await getAIMatchedJobs();
```

**No boss page imports `getAIMatchedJobs`** — confirmed via grep. The function is only used in the Mate jobs dashboard.

### Confusing Design Issue

The `aiGuardMatchingEnabled` field on `SubscriptionPlan` is displayed to bosses on the plan comparison UI:

| Plan | AI Matching shown to bosses |
|------|---------------------------|
| Starter ($29) | ✗ |
| Professional ($79) | ✓ |
| Enterprise ($149) | ✓ |

But this field is **never enforced anywhere on the backend**. `checkJobPostingAllowed()` in `planEnforcement.ts` only checks `maxActiveJobs`, `maxGuardsPerJob`, and `maxDraftJobs`. The AI matching feature is a **guard-side tool** — bosses don't "use" or "get" it. It's misleading to show it as a boss plan feature.

**Recommendation:** Either remove `aiGuardMatchingEnabled` from `SubscriptionPlan`, or repurpose it to something bosses actually get (e.g., `prioritySupportEnabled`, `dedicatedAccountManager`, `advancedJobAnalytics`).

---

## 2. Subscription Upgrade/Downgrade ❌

### Current Implementation

There is **no upgrade or downgrade endpoint**. The only flow available:

1. Cancel current subscription (stays active until period end)
2. Resubscribe with new plan (charged full price immediately)

Bosses lose any remaining value from their current billing period. This is not how professional SaaS platforms handle this.

---

### Issue #1 — 🔴 CRITICAL BUG: PayPal Create Checks Wrong Subscription

**File:** `src/app/api/subscriptions/create-paypal/route.ts:103-109`

```ts
const existing = await BossSubscription.findOne({
  status: SubscriptionStatus.ACTIVE,   // ❌ MISSING: bossUid
});
```

**Compare with Stripe** (`create-stripe/route.ts:115-118`) which correctly includes `bossUid`:
```ts
const existing = await BossSubscription.findOne({
  bossUid,                                       // ✅ PRESENT
  status: SubscriptionStatus.ACTIVE,
});
```

**Impact:** If Boss A has an active subscription, Boss B trying to subscribe via PayPal gets blocked with "You already have an active subscription." This means only **one boss in the entire platform** can have a PayPal subscription at a time.

---

### Issue #2 — 🔴 No Upgrade/Downgrade Endpoint

No `POST /api/subscriptions/change-plan` or equivalent endpoint exists.

**What must happen for a boss to change plans today:**
1. Cancel current sub (loses remaining period value)
2. Wait for period end or immediately resubscribe
3. Pay full price for new plan from scratch

**What professional platforms do (Stripe, Chargebee, Recurly):**

| Action | Behavior | Proration |
|--------|----------|-----------|
| **Upgrade** (to more expensive plan) | Immediate: new plan activated right away | Credit remaining days on old plan, charge only the difference |
| **Downgrade** (to cheaper plan) | Scheduled: takes effect at next billing cycle | No immediate charge; new rate applies on renewal |
| **Crossgrade** (same price) | Immediate | No charge |

**Stripe already supports this natively:**
```ts
stripe.subscriptions.update(subscriptionId, {
  items: [{ id: itemId, price: newPriceId }],
  proration_behavior: 'create_prorations', // auto-calculates credits
});
```

**PayPal workaround:**
- Cancel existing subscription
- Create new subscription with prorated start date
- Or handle credit as account balance manually

---

### Issue #3 — 🟡 Frontend Hides Plan Selection From Active Subscribers

**File:** `src/app/dashboard/boss/subscription/page.tsx:495`

```tsx
{!isSubscribed && (
  // Plan selection cards are here
)}
```

Active subscribers can **only see**: status card, saved payment method, and "Cancel Subscription" button. They cannot see plan options to upgrade/downgrade.

---

### Issue #4 — 🟡 No `planTier` Audit Trail

The `Job` model does not store which plan tier the job was posted under. This means:
- Cannot run reports like "how many jobs posted by Professional vs Starter plans"
- Cannot enforce retrospective limits if a boss downgrades
- Difficult to analyze plan value vs usage

---

### Issue #5 — 🟢 No `pendingDowngradeTier` Field

The `BossSubscription` model has no field for a scheduled downgrade. This means downgrades cannot be deferred to the next billing cycle (which is the industry standard).

---

## 3. Complete File Checklist

Every relevant file reviewed:

| File | Role |
|------|------|
| `src/app/api/jobs/ai-match/route.ts` | AI matching endpoint (guards only) |
| `src/app/api/subscriptions/create-stripe/route.ts` | Stripe subscription creation |
| `src/app/api/subscriptions/create-paypal/route.ts` | PayPal subscription creation (⚠️ has bug) |
| `src/app/api/subscriptions/stripe-capture/route.ts` | Stripe subscription confirmation |
| `src/app/api/subscriptions/paypal-capture/route.ts` | PayPal subscription confirmation |
| `src/app/api/subscriptions/cancel/route.ts` | Subscription cancellation |
| `src/app/api/subscriptions/status/route.ts` | Subscription status retrieval |
| `src/app/api/subscriptions/plans/route.ts` | Plan listing |
| `src/app/api/subscriptions/payment-method/route.ts` | Payment method management |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/webhooks/paypal/route.ts` | PayPal webhook handler |
| `src/app/api/jobs/route.ts` | Job creation + plan enforcement |
| `src/app/api/admin/subscriptions/plans/route.ts` | Admin plan management |
| `src/models/BossSubscription.model.ts` | BossSubscription schema |
| `src/models/SubscriptionPlan.model.ts` | SubscriptionPlan schema |
| `src/models/User.model.ts` | User model (subscription fields) |
| `src/lib/subscriptions/planEnforcement.ts` | Plan seeding + limit enforcement |
| `src/lib/subscriptions/subscriptionChecker.ts` | Expiry checker |
| `src/lib/api/subscription.api.ts` | Client-side subscription API |
| `src/lib/api/job.api.ts` | Client-side job API (AI match) |
| `src/app/dashboard/boss/subscription/page.tsx` | Boss subscription UI |
| `src/app/dashboard/boss/page.tsx` | Boss dashboard |
| `src/app/dashboard/mate/jobs/page.tsx` | Mate jobs page (AI match UI) |
| `src/types/enums.ts` | All enum definitions |
| `src/types/subscription.types.ts` | Subscription types |
| `src/types/subscriptionPlan.types.ts` | Plan types |

---

## 4. Request/Response Alignment Check

### Subscription Status (`GET /api/subscriptions/status`)

**Response** includes:
- `isSubscribed`, `status`, `expiresAt`, `daysRemaining`, `amount`, `currency`
- `planTier`, `planFeatures` (with `aiGuardMatchingEnabled`, `analyticsEnabled`, etc.)

**Frontend usage:** Boss subscription page reads `planTier` and `planFeatures` to display current plan. ✅ Aligned.

### AI Match (`POST /api/jobs/ai-match`)

**Response:** `{ data: AIMatchedJob[], total: number }` where each job has `matchScore`, `matchBreakdown`, `matchSkillDetails`.

**Frontend usage:** Mate jobs page consumes this. ✅ Aligned (guards only).

### Create Subscription (`POST /api/subscriptions/create-stripe`)

**Request body:** `{ planTier?: SubscriptionTier }`
**Response:** `{ subscriptionId, clientSecret, amount, originalAmount, appliedOffer, currency, periodEnd, requiresPayment }`

**Frontend usage:** `handleSubscribe()` passes `selectedPlanTier`, receives `clientSecret`, renders `StripeCardForm`. ✅ Aligned.

---

## 5. Summary

| Severity | Issue | File |
|----------|-------|------|
| 🔴 Critical | PayPal `bossUid` missing in active check | `create-paypal/route.ts:104` |
| 🔴 High | No upgrade/downgrade endpoint | Missing |
| 🟡 Medium | `aiGuardMatchingEnabled` misleading for bosses | `SubscriptionPlan.model.ts` |
| 🟡 Medium | Frontend hides plan selection from subscribers | `subscription/page.tsx:495` |
| 🟢 Low | No `planTier` on Job model | `Job.model.ts` |
| 🟢 Low | No `pendingDowngradeTier` on BossSubscription | `BossSubscription.model.ts` |
