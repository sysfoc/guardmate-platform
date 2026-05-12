import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from './types/enums';

/**
 * middleware.ts — FIXED
 *
 * Key fixes:
 * 1. Removed /profile-setup (was causing 404s) — only /onboarding is used
 * 2. Authenticated users on auth pages redirect to correct dashboard by role
 * 3. Unauthenticated users hitting protected routes → /login with redirectTo param
 * 4. Role-based guards work correctly for /dashboard/boss, /dashboard/mate, /admin
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const DASHBOARD_PATHS = {
  [UserRole.BOSS]:  '/dashboard/boss',
  [UserRole.MATE]:  '/dashboard/mate',
  [UserRole.ADMIN]: '/admin',
} as const;

/** Pages only accessible when NOT logged in */
const AUTH_ONLY_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

/** Redirect here when user has Firebase session but no MongoDB role yet */
const ONBOARDING_PATH = '/onboarding';

/** Redirect here when user tries to access a role they don't have */
const UNAUTHORIZED_PATH = '/unauthorized';

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read auth cookies (set by AuthContext after login)
  const session = request.cookies.get('__session')?.value;
  const role    = request.cookies.get('__role')?.value as UserRole | undefined;
  const status  = request.cookies.get('__status')?.value;
  const onboardingComplete = request.cookies.get('__onboarding_complete')?.value === 'true';

  // Always apply security headers
  const response = NextResponse.next();
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  // ── 1. Status Guard (Banned/Suspended) ──────────────────────────────────────
  // If user is banned or suspended, they can't access ANY protected or onboarding routes
  if (session && (status === 'BANNED' || status === 'SUSPENDED')) {
    const targetPath = status === 'BANNED' ? '/banned' : '/suspended';
    if (pathname !== targetPath) {
      return NextResponse.redirect(new URL(targetPath, request.url));
    }
    return response; // Allow them to stay on their notice page
  }

  // ── Admin Auth Pages: /admin/login and /admin/register are PUBLIC ─────────────
  const isAdminAuthPage = pathname === '/admin/login' || pathname.startsWith('/admin/register');

  // ── 2. Logged-in user hitting auth pages → redirect to their dashboard ──────
  // Exclude admin auth pages (/admin/login, /admin/register) — they handle their own access
  if (session && !isAdminAuthPage && AUTH_ONLY_PAGES.some((page) => pathname.startsWith(page))) {
    if (role && DASHBOARD_PATHS[role]) {
      if (!onboardingComplete) {
        return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
      }
      return NextResponse.redirect(new URL(DASHBOARD_PATHS[role], request.url));
    }
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  // If logged-in admin hits /admin/login → redirect to admin dashboard
  if (session && role === UserRole.ADMIN && pathname === '/admin/login') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // ── 3. Protected route detection ─────────────────────────────────────────────
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/verify-email');

  // ── 4. No session → redirect to login ────────────────────────────────────────
  // NOTE: Admin routes are NOT here. Unauthorized admin access → 404 (handled by layout)
  if (!session && isProtectedPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 5. Has session but no role → onboarding (except if already going there) ──
  if (session && !role && isProtectedPath && !pathname.startsWith(ONBOARDING_PATH)) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  // ── 6. Incomplete Profile → Onboarding guard ──────────────────────────────────
  // If hitting a protected subpage but onboarding is not complete, redirect there
  // EXCEPTION: Admins do not have an onboarding flow, so they bypass this guard
  if (
    session && 
    role && 
    role !== UserRole.ADMIN && 
    !onboardingComplete && 
    isProtectedPath && 
    !pathname.startsWith(ONBOARDING_PATH)
  ) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  // ── 7. Role-based access guards ───────────────────────────────────────────────

  // Boss dashboard: only BOSS
  if (pathname.startsWith('/dashboard/boss') && role !== UserRole.BOSS) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
  }

  // Mate dashboard: only MATE
  if (pathname.startsWith('/dashboard/mate') && role !== UserRole.MATE) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
  }

  // Admin routes: role check removed from middleware.
  // Unauthorized admin access → 404 (handled by admin/layout.tsx)
  // API routes are excluded by the matcher config below.

  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run middleware on PAGE routes only. Exclude:
     * - Next.js internals (_next/static, _next/image)
     * - Static assets (favicon, sitemap, robots)
     * - ALL API routes (they handle auth via verifyAndGetUser in serverAuth)
     * - Status pages (banned, suspended)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/|banned|suspended).*)',
  ],
};