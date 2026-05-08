'use client';

import Link from 'next/link';
import { Shield, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-[var(--color-bg-base)] border-t border-[var(--color-surface-border)]">
      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" aria-label="GuardMate Home">
              <div className="bg-[var(--color-primary)] p-1.5 rounded-lg">
                <Shield className="h-5 w-5 text-white" aria-hidden="true" />
              </div>
              <span className="text-lg font-bold tracking-tight text-[var(--color-text-primary)]">
                GuardMate
              </span>
            </Link>
            <p className="text-sm leading-6 text-[var(--color-text-secondary)] mb-6 max-w-xs">
              Connecting verified security professionals with businesses.
            </p>
            <div className="space-y-2">
              <a href="mailto:support@guardmate.com" className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                <Mail className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                support@guardmate.com
              </a>
              <a href="tel:+61130048273" className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">
                <Phone className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                1300 GUARD (48273)
              </a>
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                Operating Nationwide
              </div>
            </div>
          </div>

          {/* For Guards */}
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
              For Guards
            </h3>
            <ul className="space-y-2">
              <li><Link href="/register" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Register as a Guard</Link></li>
              <li><Link href="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Guard Login</Link></li>
              <li><Link href="#how-it-works" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">How it Works</Link></li>
              <li><Link href="/contact" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Support</Link></li>
            </ul>
          </div>

          {/* For Businesses */}
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
              For Businesses
            </h3>
            <ul className="space-y-2">
              <li><Link href="/register" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Post a Job</Link></li>
              <li><Link href="/login" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Business Login</Link></li>
              <li><Link href="#how-it-works" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Hiring Process</Link></li>
              <li><Link href="/contact" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Enterprise Enquiry</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] uppercase tracking-wider mb-4">
              Legal
            </h3>
            <ul className="space-y-2">
              <li><Link href="/terms" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/terms" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[var(--color-surface-border)]">
        <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--color-text-muted)]">
            &copy; {new Date().getFullYear()} GuardMate Platform. All rights reserved.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            Professional security staffing, simplified.
          </p>
        </div>
      </div>
    </footer>
  );
}
