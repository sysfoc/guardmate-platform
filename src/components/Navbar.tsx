'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { useState } from 'react';
import toast from 'react-hot-toast';

export function Navbar() {
  const router = useRouter();
  const { firebaseUser, logout } = useAuth();
  const { user, getDashboardPath } = useUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully.');
      router.push('/login');
    } catch {
      toast.error('Logout failed. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--color-surface-border)] bg-[var(--color-bg-base)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="bg-[var(--color-primary)] p-1.5 rounded-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)]">
            GuardMate
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {firebaseUser && user ? (
            // Logged in
            <>
              <Link href={getDashboardPath()}>
                <Button variant="ghost" size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                  Dashboard
                </Button>
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-surface-border)]">
                <DarkModeToggle />
                <Avatar src={user.profilePhoto ?? undefined} name={`${user.firstName} ${user.lastName}`} size="sm" />
                <Button
                  variant="ghost"
                  size="sm"
                  loading={loggingOut}
                  onClick={handleLogout}
                  leftIcon={<LogOut className="h-4 w-4" />}
                  className="text-[var(--color-danger)] hover:bg-[var(--color-danger-light)]"
                >
                  Logout
                </Button>
              </div>
            </>
          ) : (
            // Logged out
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}