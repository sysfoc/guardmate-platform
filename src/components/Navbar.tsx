'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, LayoutDashboard, Briefcase, Send } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@/context/UserContext';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { DarkModeToggle } from '@/components/ui/DarkModeToggle';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Dropdown, DropdownItem, DropdownDivider } from '@/components/ui/Dropdown';
import { User, Settings, LogOut as LogOutIcon, ChevronDown, Star, Wallet, CreditCard } from 'lucide-react';
import { GlobalChatListener } from '@/components/chat/GlobalChatListener';

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
          <span className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] hidden sm:block">
            GuardMate
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2 sm:gap-3">
          {firebaseUser && user ? (
            // Logged in
            <>
              <Link href={getDashboardPath()}>
                <Button variant="ghost" size="sm" leftIcon={<LayoutDashboard className="h-4 w-4" />}>
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--color-surface-border)]">
                <GlobalChatListener userId={user.uid} role={user.role} />
                <DarkModeToggle />
                
                <Dropdown
                  trigger={
                    <div className="flex items-center gap-2 p-1 pl-2 hover:bg-[var(--color-bg-secondary)] rounded-full transition-colors group cursor-pointer">
                      <div className="hidden sm:flex flex-col items-end mr-1">
                        <span className="text-xs font-bold text-[var(--color-text-primary)] leading-tight">
                          {user.firstName}
                        </span>
                        <span className="text-[10px] text-[var(--color-text-tertiary)] font-bold uppercase tracking-wider">
                          {user.role}
                        </span>
                      </div>
                      <Avatar 
                        src={user.profilePhoto ?? undefined} 
                        name={`${user.firstName} ${user.lastName}`} 
                        size="sm" 
                        role={user.role}
                      />
                      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)] transition-colors" />
                    </div>
                  }
                >
                  <div className="px-4 py-3 border-b border-[var(--color-border-primary)] bg-[var(--color-bg-secondary)]/30">
                    <p className="text-sm font-bold truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-[10px] text-[var(--color-text-tertiary)] truncate mt-0.5">{user.email}</p>
                  </div>
                  
                  <DropdownItem onClick={() => router.push(user.role === 'BOSS' ? '/dashboard/boss/profile' : '/dashboard/mate/profile')}>
                    <User className="h-4 w-4 mr-2" />
                    My Profile
                  </DropdownItem>

                  <DropdownItem onClick={() => router.push(user.role === 'BOSS' ? '/dashboard/boss/reviews' : '/dashboard/mate/reviews')}>
                    <Star className="h-4 w-4 mr-2" />
                    My Reviews
                  </DropdownItem>
                  
                  {user.role === 'BOSS' && (
                    <>
                      <DropdownItem onClick={() => router.push('/dashboard/boss/jobs')}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        My Jobs
                      </DropdownItem>
                      <DropdownItem onClick={() => router.push('/dashboard/boss/payments')}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Payments & Escrow
                      </DropdownItem>
                    </>
                  )}
                  {user.role === 'MATE' && (
                    <>
                      <DropdownItem onClick={() => router.push('/dashboard/mate/jobs')}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        Browse Jobs
                      </DropdownItem>
                      <DropdownItem onClick={() => router.push('/dashboard/mate/bids')}>
                        <Send className="h-4 w-4 mr-2" />
                        My Bids
                      </DropdownItem>
                      <DropdownItem onClick={() => router.push('/dashboard/mate/wallet')}>
                        <Wallet className="h-4 w-4 mr-2" />
                        Mate Wallet
                      </DropdownItem>
                    </>
                  )}

                  <DropdownItem onClick={() => router.push('/dashboard/settings')}>
                    <Settings className="h-4 w-4 mr-2" />
                    Account Settings
                  </DropdownItem>
                  
                  <DropdownDivider />
                  
                  <DropdownItem 
                    variant="danger" 
                    onClick={handleLogout}
                  >
                    <LogOutIcon className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownItem>
                </Dropdown>
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