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
import { PlatformProvider } from '@/context/PlatformContext';
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
              <PlatformProvider>
                {children}

                {/*
                 * ✅ CRITICAL: Toaster must be inside providers but at root level.
                 * Without this component, react-hot-toast calls (toast.success,
                 * toast.error, etc.) fire but render nothing visible.
                 */}
                <Toaster
                  position="top-right"
                  gutter={8}
                  containerStyle={{ zIndex: 99999 }}
                  toastOptions={{
                    duration: 4000,
                    className: '!bg-white dark:!bg-slate-900 !text-slate-900 dark:!text-slate-100 !border !border-slate-200 dark:!border-slate-800 !shadow-2xl !rounded-xl text-sm font-medium',
                    style: {
                      background: 'transparent', // Let Tailwind classes handle it
                      boxShadow: 'none',         // Let Tailwind classes handle it
                      border: 'none',            // Let Tailwind classes handle it
                      color: 'inherit',          // Let Tailwind classes handle it
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
              </PlatformProvider>
            </UserProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}