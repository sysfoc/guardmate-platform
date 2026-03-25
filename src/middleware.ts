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

  // ── 2. Logged-in user hitting auth pages → redirect to their dashboard ──────
  if (session && AUTH_ONLY_PAGES.some((page) => pathname.startsWith(page))) {
    // If they are banned/suspended, handled above. 
    // If they are active:
    if (role && DASHBOARD_PATHS[role]) {
      // Send to onboarding first if role assigned but profile incomplete
      if (!onboardingComplete) {
        return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
      }
      return NextResponse.redirect(new URL(DASHBOARD_PATHS[role], request.url));
    }
    // Has session but no role → send to onboarding
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  // ── 2. Protected route detection ─────────────────────────────────────────────
  const isProtectedPath =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/verify-email');

  // ── 3. No session → redirect to login ────────────────────────────────────────
  if (!session && isProtectedPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── 4. Has session but no role → onboarding (except if already going there) ──
  if (session && !role && isProtectedPath && !pathname.startsWith(ONBOARDING_PATH)) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  // ── 5. Incomplete Profile → Onboarding guard ──────────────────────────────────
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

  // ── 6. Role-based access guards ───────────────────────────────────────────────

  // Boss dashboard: only BOSS
  if (pathname.startsWith('/dashboard/boss') && role !== UserRole.BOSS) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
  }

  // Mate dashboard: only MATE
  if (pathname.startsWith('/dashboard/mate') && role !== UserRole.MATE) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
  }

  // Admin panel: only ADMIN (pages + API routes)
  const isAdminPath =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin');

  if (isAdminPath && role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL(UNAUTHORIZED_PATH, request.url));
  }

  return response;
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Run middleware on all paths EXCEPT:
     * - Next.js internals (_next/static, _next/image)
     * - Static assets (favicon, sitemap, robots)
     * - Public API auth endpoints (register, google, assign-role)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/auth/register|api/auth/google|api/auth/assign-role|api/auth/logout|banned|suspended).*)',
  ],
};