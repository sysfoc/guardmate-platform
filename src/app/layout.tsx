/**
 * app/layout.tsx — FIXED
 *
 * Key fix: Added <Toaster /> from react-hot-toast.
 * Without this, ALL toast.success() / toast.error() calls are SILENT.
 * This is why you saw no feedback on login/register actions.
 *
 * Also includes:
 * - ThemeProvider with flash-prevention script
 * - AuthProvider + UserProvider wrapping
 * - Proper metadata
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import { UserProvider } from '@/context/UserContext';
import { ThemeProvider, THEME_SCRIPT } from '@/context/ThemeContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GuardMate — Professional Security Platform',
  description: 'Connecting top-tier security personnel with elite businesses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Flash-prevention: applies correct theme class before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <AuthProvider>
            <UserProvider>
              {children}

              {/*
               * ✅ CRITICAL: Toaster must be inside providers but at root level.
               * Without this component, react-hot-toast calls (toast.success,
               * toast.error, etc.) fire but render nothing visible.
               */}
              <Toaster
                position="top-right"
                gutter={8}
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-surface-border)',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  },
                  success: {
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                    duration: 5000,
                  },
                }}
              />
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}