/**
 * Admin Dispute Resolution Route
 * ─────────────────────────────────────────────────────────────────────────────
 * Re-exports the resolve handler from the public disputes route.
 * This keeps the resolution logic in one place while serving it
 * under the /api/admin/ namespace for consistency with other admin routes.
 */
export { PATCH } from '@/app/api/disputes/[id]/resolve/route';
