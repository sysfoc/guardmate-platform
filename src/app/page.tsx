'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Shield, Briefcase, ArrowRight, CheckCircle2, Clock,
  MapPin, CreditCard, Star, FileCheck, Bell,
  Wallet, Building2, Smartphone, ShieldCheck, Zap, BarChart3,
  MessageSquare, LayoutDashboard, User, Send
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ReviewCarousel } from '@/components/landing/ReviewCarousel';
import { ContactSection } from '@/components/landing/ContactSection';
import { useUser } from '@/context/UserContext';
import { UserRole } from '@/types/enums';
import { getMyReviewsPage, getPublicReviews } from '@/lib/api/review.api';
import type { Review } from '@/types/review.types';
import type { BossProfile, MateProfile } from '@/types/user.types';

/* ────────────────────────────────────────────────────────────── */

function GuardHome() {
  const { user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const revRes = await getMyReviewsPage('received', 1, 9);
      if (cancelled) return;
      if (revRes.success && revRes.data) setReviews(revRes.data.reviews || []);
    })();
    return () => { cancelled = true; };
  }, []);


  const mate = user as MateProfile | null;
  const firstName = mate?.firstName || 'Guard';

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />
      <main id="main-content" className="flex-grow">
        {/* Welcome */}
        <section className="pt-6 pb-5 sm:pt-8 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Welcome back, <span className="text-[var(--color-primary)]">{firstName}</span>
            </h1>
            <p className="mt-2 text-base text-[var(--color-text-secondary)]">
              Browse shifts, manage your schedule, and track earnings from one place.
            </p>
          </div>
        </section>

        {/* Quick actions */}
        <section className="pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Briefcase, label: 'Browse Jobs', href: '/dashboard/mate/jobs', desc: 'Find shifts' },
                { icon: Send, label: 'My Bids', href: '/dashboard/mate/bids', desc: 'Track applications' },
                { icon: Wallet, label: 'Wallet', href: '/dashboard/mate/wallet', desc: 'View earnings' },
                { icon: User, label: 'Profile', href: '/dashboard/mate/profile', desc: 'Update details' },
              ].map((card) => (
                <Link key={card.label} href={card.href} className="group rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <card.icon className="h-5 w-5 text-[var(--color-primary)] mb-2" aria-hidden="true" />
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{card.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{card.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it works + Features */}
        <section className="pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">How GuardMate works for you</h3>
                <ul className="space-y-2">
                  {[
                    'Browse available shifts and apply to those that match your skills',
                    'Get notified when a business accepts your bid',
                    'Track shifts, submit reports, and get paid through escrow',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[10px] font-bold text-[var(--color-primary)] flex-shrink-0">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Button href="/dashboard/mate/jobs" size="sm" rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>Browse Jobs</Button>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Guard features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: MapPin, text: 'Geo-matched shifts' },
                    { icon: Clock, text: 'Flexible hours' },
                    { icon: CreditCard, text: 'Escrow payments' },
                    { icon: Star, text: 'Build reputation' },
                    { icon: ShieldCheck, text: 'Licence verification' },
                    { icon: MessageSquare, text: 'Direct messaging' },
                  ].map((f) => (
                    <div key={f.text} className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2">
                      <f.icon className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs text-[var(--color-text-secondary)]">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform stats */}
        <section className="pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Platform at a glance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Open Jobs', value: '120+', icon: Briefcase },
                  { label: 'Verified Guards', value: '2,800+', icon: ShieldCheck },
                  { label: 'Shifts Filled', value: '98%', icon: CheckCircle2 },
                  { label: 'Avg Rating', value: '4.8/5', icon: Star },
                ].map((s) => (
                  <div key={s.label} className="text-center rounded-lg bg-[var(--color-bg-subtle)] p-3">
                    <s.icon className="h-4 w-4 mx-auto text-[var(--color-primary)] mb-1" aria-hidden="true" />
                    <p className="text-lg font-extrabold text-[var(--color-text-primary)]">{s.value}</p>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews carousel */}
        <ReviewCarousel
          reviews={reviews}
          title="Your Reviews"
          subtitle="Feedback from businesses you have worked with"
        />

        {/* Contact */}
        <ContactSection />

        {/* CTA */}
        <section className="pt-1 sm:pt-2 pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative isolate overflow-hidden rounded-2xl bg-[var(--color-primary)] px-6 py-8 text-center shadow-xl sm:px-12">
              <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Keep your profile updated</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">A complete profile with verified licences helps you get more shift offers.</p>
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button href="/dashboard/mate/profile" size="md" className="bg-white text-[var(--color-primary)] hover:bg-white/90">Go to Profile</Button>
                <Button href="/dashboard/mate/jobs" size="md" variant="outline" className="border-white text-white hover:bg-white hover:text-[var(--color-primary)]">Browse Jobs</Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function BossHome() {
  const { user } = useUser();
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const revRes = await getMyReviewsPage('received', 1, 9);
      if (cancelled) return;
      if (revRes.success && revRes.data) setReviews(revRes.data.reviews || []);
    })();
    return () => { cancelled = true; };
  }, []);


  const boss = user as BossProfile | null;
  const displayName = boss?.companyName || boss?.firstName || 'Business';

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />
      <main id="main-content" className="flex-grow">
        {/* Welcome */}
        <section className="pt-6 pb-5 sm:pt-8 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
              Welcome back, <span className="text-[var(--color-primary)]">{displayName}</span>
            </h1>
            <p className="mt-2 text-base text-[var(--color-text-secondary)]">
              Post shifts, review guard bids, and manage your security workforce.
            </p>
          </div>
        </section>

        {/* Quick actions */}
        <section className="pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Briefcase, label: 'Post a Job', href: '/dashboard/boss/jobs', desc: 'New shift' },
                { icon: LayoutDashboard, label: 'My Jobs', href: '/dashboard/boss/jobs', desc: 'Manage shifts' },
                { icon: CreditCard, label: 'Payments', href: '/dashboard/boss/payments', desc: 'Escrow & billing' },
                { icon: User, label: 'Profile', href: '/dashboard/boss/profile', desc: 'Company details' },
              ].map((card) => (
                <Link key={card.label} href={card.href} className="group rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 hover:shadow-md transition-all hover:-translate-y-0.5">
                  <card.icon className="h-5 w-5 text-[var(--color-primary)] mb-2" aria-hidden="true" />
                  <p className="text-sm font-bold text-[var(--color-text-primary)]">{card.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{card.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How it works + Features */}
        <section className="pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">How GuardMate works for your business</h3>
                <ul className="space-y-2">
                  {[
                    'Post shifts with detailed requirements in minutes',
                    'Review bids from verified guards with full profile access',
                    'Track shifts in real time and pay only when work is complete',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-secondary)]">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary-light)] text-[10px] font-bold text-[var(--color-primary)] flex-shrink-0">{i + 1}</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <Button href="/dashboard/boss/jobs" size="sm" rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>Post a Job</Button>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
                <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Business features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: ShieldCheck, text: 'Licence checks' },
                    { icon: MapPin, text: 'Live tracking' },
                    { icon: CreditCard, text: 'Escrow payments' },
                    { icon: BarChart3, text: 'Reports & DARs' },
                    { icon: Bell, text: 'Instant alerts' },
                    { icon: MessageSquare, text: 'Team messaging' },
                  ].map((f) => (
                    <div key={f.text} className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-subtle)] px-3 py-2">
                      <f.icon className="h-3.5 w-3.5 text-[var(--color-primary)] flex-shrink-0" aria-hidden="true" />
                      <span className="text-xs text-[var(--color-text-secondary)]">{f.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Platform stats */}
        <section className="pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-4">Platform at a glance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Verified Guards', value: '2,800+', icon: ShieldCheck },
                  { label: 'Shifts Completed', value: '18,000+', icon: CheckCircle2 },
                  { label: 'Avg Rating', value: '4.8/5', icon: Star },
                  { label: 'Business Clients', value: '450+', icon: Building2 },
                ].map((s) => (
                  <div key={s.label} className="text-center rounded-lg bg-[var(--color-bg-subtle)] p-3">
                    <s.icon className="h-4 w-4 mx-auto text-[var(--color-primary)] mb-1" aria-hidden="true" />
                    <p className="text-lg font-extrabold text-[var(--color-text-primary)]">{s.value}</p>
                    <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Reviews carousel */}
        <ReviewCarousel
          reviews={reviews}
          title="Your Reviews"
          subtitle="Feedback from guards you have worked with"
        />

        {/* Contact */}
        <ContactSection />

        {/* CTA */}
        <section className="pt-1 sm:pt-2 pb-5 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative isolate overflow-hidden rounded-2xl bg-[var(--color-primary)] px-6 py-8 text-center shadow-xl sm:px-12">
              <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Hire with confidence</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">Post your next shift and connect with verified security professionals.</p>
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button href="/dashboard/boss/jobs" size="md" className="bg-white text-[var(--color-primary)] hover:bg-white/90">Post a Job</Button>
                <Button href="/dashboard/boss/profile" size="md" variant="outline" className="border-white text-white hover:bg-white hover:text-[var(--color-primary)]">Company Profile</Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

function PublicHome() {
  const [publicReviews, setPublicReviews] = useState<Review[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getPublicReviews(9);
      if (cancelled) return;
      if (res.success && res.data) setPublicReviews(res.data.reviews || []);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />

      <main id="main-content" className="flex-grow">
        {/* HERO */}
        <section className="relative overflow-hidden pt-6 pb-8 sm:pt-8 sm:pb-10">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(60rem_50rem_at_top_right,var(--color-primary-light),transparent)] opacity-30" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--color-surface-border)] to-transparent" />
          </div>

          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
              <div className="max-w-xl lg:max-w-none">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-light)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/10">
                  <Zap className="h-3.5 w-3.5" aria-hidden="true" />
                  Now live across the country
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-4xl lg:text-5xl leading-[1.15]">
                  Trusted{' '}
                  <span className="text-[var(--color-primary)]">Security Workforce</span>{' '}
                  Platform
                </h1>
                <p className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">
                  Connect verified security professionals with businesses that need them.
                  Post shifts, manage schedules, track patrols, and handle payments — all in one secure platform.
                </p>
                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <Button href="/register" size="lg" rightIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}>
                    Get Started Free
                  </Button>
                  <Button href="/login" size="lg" variant="outline">Log In</Button>
                </div>
                <p className="mt-3 text-xs text-[var(--color-text-muted)]">
                  No credit card required. Free for guards. Flexible plans for businesses.
                </p>
              </div>

              <div className="relative hidden lg:block">
                <div className="relative rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--color-surface-border)]">
                      <div className="flex items-center gap-2">
                        <div className="bg-[var(--color-primary)] p-1.5 rounded-lg">
                          <Shield className="h-4 w-4 text-white" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--color-text-primary)]">Active Shift</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">City Centre</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-light)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-success)]">
                        <span className="h-1 w-1 rounded-full bg-[var(--color-success)]" aria-hidden="true" />
                        On Duty
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Open Jobs', value: '124', icon: Briefcase },
                        { label: 'Guards', value: '2,847', icon: ShieldCheck },
                        { label: 'Filled', value: '98%', icon: CheckCircle2 },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-[var(--color-bg-subtle)] p-2 text-center">
                          <stat.icon className="h-4 w-4 mx-auto text-[var(--color-primary)] mb-1" aria-hidden="true" />
                          <p className="text-base font-extrabold text-[var(--color-text-primary)]">{stat.value}</p>
                          <p className="text-[9px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-lg border border-[var(--color-surface-border)] p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden="true" />
                        <span className="text-xs font-bold text-[var(--color-text-primary)]">Live Patrol Route</span>
                        <span className="ml-auto text-[10px] text-[var(--color-text-muted)]">Updated 2m ago</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[var(--color-bg-subtle)] overflow-hidden" role="progressbar" aria-valuenow={75} aria-valuemin={0} aria-valuemax={100} aria-label="Patrol route completion">
                        <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="border-y border-[var(--color-surface-border)] bg-[var(--color-bg-subtle)]">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '2,800+', label: 'Verified Guards' },
                { value: '450+', label: 'Business Clients' },
                { value: '18,000+', label: 'Shifts Completed' },
                { value: '4.8/5', label: 'Average Rating' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-xl sm:text-2xl font-extrabold text-[var(--color-primary)]">{stat.value}</p>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-8 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-bold leading-6 text-[var(--color-primary)] uppercase tracking-wider">How It Works</h2>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Security staffing, simplified</p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Guards and businesses connected in three simple steps.</p>
            </div>
            <div className="mx-auto mt-5 max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { step: '01', title: 'Create Your Profile', desc: 'Upload licences or set up your company profile.', icon: FileCheck },
                { step: '02', title: 'Post or Apply', desc: 'Businesses post shifts. Guards browse and apply.', icon: Briefcase },
                { step: '03', title: 'Work & Get Paid', desc: 'Track shifts in real-time. Payments held in escrow.', icon: CreditCard },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-primary)] shadow-md">
                    <item.icon className="h-5 w-5 text-white" aria-hidden="true" />
                  </div>
                  <span className="text-[10px] font-extrabold text-[var(--color-text-muted)] uppercase tracking-widest">{item.step}</span>
                  <h3 className="mt-1 text-base font-bold text-[var(--color-text-primary)]">{item.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)] max-w-xs">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FOR GUARDS */}
        <section className="py-10 sm:py-16 bg-[var(--color-bg-subtle)] border-y border-[var(--color-surface-border)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h2 className="text-sm font-bold leading-6 text-[var(--color-primary)] uppercase tracking-wider">For Security Guards</h2>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Find work that fits your schedule</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Browse shifts, apply in seconds, and get paid securely. Build your reputation with every job.</p>
                <ul className="mt-4 space-y-2">
                  {[
                    'Verified licence & background checks boost your profile',
                    'Real-time shift notifications for your preferred locations',
                    'Escrow-protected payments — always get paid on time',
                    'Ratings and reviews from every business you work with',
                    'In-app incident reporting and site tour tracking',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--color-primary)] mt-0.5" aria-hidden="true" />
                      <span className="text-xs text-[var(--color-text-secondary)] leading-5">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Button href="/register" size="md" rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>Register as a Guard</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin, label: 'Geo-matched Jobs', desc: 'Find shifts near you' },
                  { icon: Clock, label: 'Flexible Hours', desc: 'Pick your own schedule' },
                  { icon: Wallet, label: 'Fast Payments', desc: 'Direct to your wallet' },
                  { icon: Star, label: 'Build Reputation', desc: 'Earn more with reviews' },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-4 shadow-sm hover:shadow-md transition-shadow">
                    <card.icon className="h-5 w-5 text-[var(--color-primary)] mb-2" aria-hidden="true" />
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">{card.label}</p>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-0.5">{card.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FOR BUSINESSES */}
        <section className="py-10 sm:py-16">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1">
                <div className="rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 shadow-lg">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 pb-3 border-b border-[var(--color-surface-border)]">
                      <Building2 className="h-5 w-5 text-[var(--color-primary)]" aria-hidden="true" />
                      <div>
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">Corporate Event Security</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">Posted 2 hours ago</p>
                      </div>
                      <span className="ml-auto text-[10px] font-bold text-[var(--color-primary)] bg-[var(--color-primary-light)] px-2 py-0.5 rounded-full">12 Bids</span>
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'James R.', rating: 4.9, status: 'SIA Licensed' },
                        { name: 'Sarah M.', rating: 4.8, status: 'First Aid Certified' },
                        { name: 'David K.', rating: 5.0, status: 'White Card' },
                      ].map((bid, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--color-bg-subtle)] p-2">
                          <div className="h-6 w-6 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center text-[10px] font-bold text-[var(--color-primary)]" aria-hidden="true">{bid.name.charAt(0)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[var(--color-text-primary)] truncate">{bid.name}</p>
                            <p className="text-[9px] text-[var(--color-text-muted)]">{bid.status}</p>
                          </div>
                          <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Star className="h-3 w-3 text-[var(--color-secondary)] fill-[var(--color-secondary)]" aria-hidden="true" />
                            <span className="text-[10px] font-bold text-[var(--color-text-primary)]">{bid.rating}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-sm font-bold leading-6 text-[var(--color-primary)] uppercase tracking-wider">For Businesses</h2>
                <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Hire verified guards in minutes</p>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Post shifts, compare bids, and hire with confidence. Full visibility from posting to payment.</p>
                <ul className="mt-4 space-y-2">
                  {[
                    'Post shifts and events with detailed requirements quickly',
                    'View guard profiles, licences, ratings, and past performance',
                    'Escrow-protected payments — only pay when work is verified complete',
                    'Real-time shift tracking, incident reports, and site tours',
                    'Manage multiple guards, locations, and recurring schedules',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--color-primary)] mt-0.5" aria-hidden="true" />
                      <span className="text-xs text-[var(--color-text-secondary)] leading-5">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Button href="/register" size="md" rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}>Post Your First Job</Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-10 sm:py-16 bg-[var(--color-bg-subtle)] border-y border-[var(--color-surface-border)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-sm font-bold leading-6 text-[var(--color-primary)] uppercase tracking-wider">Platform Features</h2>
              <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Everything you need in one platform</p>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Built for the security industry — from patrol tracking to payment protection.</p>
            </div>
            <div className="mx-auto mt-5 max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, title: 'Licence Verification', desc: 'Automated licence and background check verification for every guard.' },
                { icon: Clock, title: 'Shift Scheduling', desc: 'Multi-day schedules with guard assignments and time slots.' },
                { icon: MapPin, title: 'Live Tracking', desc: 'GPS tracking, geofencing, and patrol route verification.' },
                { icon: CreditCard, title: 'Escrow Payments', desc: 'Funds held securely until shift completion.' },
                { icon: Bell, title: 'Instant Notifications', desc: 'Alerts for jobs, bids, approvals, and reminders.' },
                { icon: BarChart3, title: 'Reports & Analytics', desc: 'Incident reports, DARs, and performance dashboards.' },
                { icon: MessageSquare, title: 'Built-in Messaging', desc: 'Direct chat between guards and businesses.' },
                { icon: Smartphone, title: 'Mobile Optimised', desc: 'Mobile-friendly dashboard for on-the-go use.' },
                { icon: FileCheck, title: 'Compliance Ready', desc: 'Document uploads, expiry tracking, and audit trails.' },
              ].map((feature) => (
                <div key={feature.title} className="group rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 hover:shadow-md transition-all">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-light)] group-hover:bg-[var(--color-primary)] transition-colors">
                    <feature.icon className="h-4 w-4 text-[var(--color-primary)] group-hover:text-white transition-colors" aria-hidden="true" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">{feature.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[var(--color-text-secondary)]">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <ReviewCarousel
          reviews={publicReviews}
          title="Trusted by Professionals"
          subtitle="What our users say"
        />

        {/* FINAL CTA */}
        <section className="py-5 sm:py-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="relative isolate overflow-hidden rounded-2xl bg-[var(--color-primary)] px-6 py-8 text-center shadow-xl sm:px-12">
              <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight text-white sm:text-3xl">Ready to get started?</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/80">Join security professionals and businesses using GuardMate. Free to sign up, no hidden fees.</p>
              <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button href="/register" size="md" variant="outline" className="border-white text-white hover:bg-white hover:text-[var(--color-primary)]">Create Free Account</Button>
                <Button href="/login" size="md" className="bg-white text-[var(--color-primary)] hover:bg-white/90">Log In</Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default function Home() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
        <Navbar />
        <main id="main-content" className="flex-grow">
          {/* Hero skeleton — matches PublicHome hero dimensions to prevent CLS */}
          <section className="relative overflow-hidden pt-6 pb-8 sm:pt-8 sm:pb-10">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
                <div className="max-w-xl lg:max-w-none space-y-4">
                  {/* Badge */}
                  <div className="h-6 w-48 rounded-full bg-[var(--color-bg-subtle)] animate-pulse" />
                  {/* H1 */}
                  <div className="h-10 sm:h-12 lg:h-14 w-full max-w-xl rounded-lg bg-[var(--color-bg-subtle)] animate-pulse" />
                  {/* Description */}
                  <div className="h-5 w-full max-w-lg rounded-lg bg-[var(--color-bg-subtle)] animate-pulse" />
                  {/* Buttons */}
                  <div className="h-12 w-64 rounded-lg bg-[var(--color-bg-subtle)] animate-pulse" />
                  {/* Fine print */}
                  <div className="h-4 w-3/4 max-w-md rounded-lg bg-[var(--color-bg-subtle)] animate-pulse" />
                </div>
                {/* Demo card — hidden on mobile, visible on lg */}
                <div className="hidden lg:block h-[320px] rounded-2xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 animate-pulse" />
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (user?.role === UserRole.MATE) return <GuardHome />;
  if (user?.role === UserRole.BOSS) return <BossHome />;
  return <PublicHome />;
}