# Implementation Plan: Expired License Restriction Flow

This document outlines the technical strategy for handling users (Mates and Bosses) whose professional licenses or company registrations have expired.

## 1. Overview
Unlike a **Ban** (permanent) or **Suspension** (timed), an **Expired License** is a "compliance block." The user is allowed to log in and manage their profile, but they are restricted from "Revenue-Generating Activities" (applying for jobs, posting jobs, hiring).

## 2. Detection Logic

### Mate (Guard) Expiry
- **Field:** `licenseExpiry` (Date)
- **Condition:** `new Date() > licenseExpiry`
- **Result:** `LicenseStatus.EXPIRED`

### Boss (Company) Expiry
- **Field:** `companyLicenseExpiry` (Date)
- **Condition:** `new Date() > companyLicenseExpiry`
- **Result:** `LicenseStatus.EXPIRED`

## 3. Proposed Implementation

### Phase A: Auth State Awareness
Extend `UserContext.tsx` or a custom hook `useLicenseStatus` to calculate the real-time status.
```typescript
const isExpired = user?.licenseExpiry && new Date(user.licenseExpiry) < new Date();
```

### Phase B: Global Banner
Implement a non-dismissible `WarningBanner` at the top of the Dashboard if a license is expired.
- **Message:** "Your professional license has expired. Please upload a renewed document to continue applying for jobs."
- **Action:** Button linking directly to the "License Update" section of their profile.

### Phase C: Activity Locks
Add server-side and client-side guards on specific actions:
- **Mate:** Disable the "Apply" button on Job Details. Throw 403 error in `api/jobs/[id]/apply` if license is expired.
- **Boss:** Disable the "Post New Job" button. Throw 403 error in `api/jobs/create`.

### Phase D: Resolution Flow
1. User uploads new document in `Profile > License`.
2. `licenseStatus` changes to `PENDING_REVIEW`.
3. Account remains restricted until an **Admin** verifies the date and document.
4. Admin approves -> Status becomes `VALID` -> Restrictions lifted.

## 4. Middleware vs. In-Page Guards
- **Do NOT** use middleware to block the entire site (user must be able to reach the help desk or profile).
- **DO** use in-page logic to "grey out" features and provide helpful tooltips.

---
*Created: 2026-03-13 — Deferred for future development phase.*
