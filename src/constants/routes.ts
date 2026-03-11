// src/constants/routes.ts
// ─── Application Route Constants ─────────────────────────────────────────────

export const ROUTES = {
  // Public
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  PRICING: '/pricing',

  // Auth — these MUST match your actual file paths in app/
  // Your pages are at app/(auth)/login, app/(auth)/register, etc.
  // The (auth) group folder is transparent in URLs, so the paths are just /login etc.
  LOGIN:            '/login',
  REGISTER:         '/register',
  FORGOT_PASSWORD:  '/forgot-password',
  RESET_PASSWORD:   '/reset-password',
  VERIFY_EMAIL:     '/verify-email',
  SELECT_ROLE:      '/register',   // step=role is a query param, not a route

  // Onboarding
  ONBOARDING: '/onboarding',

  // Boss Dashboard
  BOSS_DASHBOARD:    '/dashboard/boss',
  BOSS_JOBS:         '/dashboard/boss/jobs',
  BOSS_JOBS_CREATE:  '/dashboard/boss/jobs/create',
  BOSS_BOOKINGS:     '/dashboard/boss/bookings',
  BOSS_PROFILE:      '/dashboard/boss/profile',

  // Mate Dashboard
  MATE_DASHBOARD:  '/dashboard/mate',
  MATE_JOBS:       '/dashboard/mate/jobs',
  MATE_BOOKINGS:   '/dashboard/mate/bookings',
  MATE_PROFILE:    '/dashboard/mate/profile',

  // Admin
  ADMIN:         '/admin',
  ADMIN_USERS:   '/admin/users',
  ADMIN_JOBS:    '/admin/jobs',
  ADMIN_REPORTS: '/admin/reports',

  // Shared
  PROFILE:       '/profile',
  SETTINGS:      '/settings',
  NOTIFICATIONS: '/notifications',
  UNAUTHORIZED:  '/unauthorized',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];