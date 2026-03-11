import Link from 'next/link';
import { Shield, Briefcase, Users, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Navbar } from '@/components/Navbar';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />

      <main className="flex-grow">
        {/* Hero */}
        <section className="relative overflow-hidden py-12 sm:py-20">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-primary-light),transparent)] opacity-20" />
          <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
            <div className="mx-auto max-w-2xl">
              <div className="mb-8 flex justify-center">
                <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-[var(--color-text-secondary)] ring-1 ring-[var(--color-surface-border)] hover:ring-[var(--color-primary)] transition-all">
                  Now live in the United Kingdom.{' '}
                  <Link href="/register" className="font-semibold text-[var(--color-primary)]">
                    <span className="absolute inset-0" aria-hidden="true" />
                    Read more <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
                The Future of Security Professionalism
              </h1>
              <p className="mt-6 text-lg leading-8 text-[var(--color-text-secondary)]">
                Connecting top-tier security personnel with elite businesses. Simple, secure, and professional.
              </p>
              <div className="mt-10 flex items-center justify-center gap-x-6">
                <Link href="/register">
                  <Button size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
                    Get Started
                  </Button>
                </Link>
                <Link href="/login">
                  <span className="text-sm font-semibold leading-6 text-[var(--color-text-primary)] hover:underline">
                    Already a member? Log in <span aria-hidden="true">→</span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24 bg-[var(--color-bg-subtle)] border-y border-[var(--color-surface-border)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="mx-auto max-w-2xl lg:text-center">
              <h2 className="text-base font-semibold leading-7 text-[var(--color-primary)] uppercase tracking-wider">
                Platform Features
              </h2>
              <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
                Everything you need to manage security
              </p>
            </div>
            <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
              <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
                {[
                  { icon: Shield, title: 'Verified Personnel', desc: 'All security personnel go through a rigorous SIA license and background verification process.' },
                  { icon: Briefcase, title: 'Instantly Post Jobs', desc: 'Businesses can post shifts and event security requirements in minutes and receive instant bids.' },
                  { icon: Users, title: 'Transparent Ratings', desc: 'Build your reputation with reviews from every shift. Hire with confidence based on real performance data.' },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex flex-col">
                    <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-[var(--color-text-primary)]">
                      <Icon className="h-5 w-5 flex-none text-[var(--color-primary)]" />
                      {title}
                    </dt>
                    <dd className="mt-4 text-base leading-7 text-[var(--color-text-secondary)]">{desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[var(--color-bg-base)] border-t border-[var(--color-surface-border)]">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <span className="text-gray-400 md:order-2">&copy; {new Date().getFullYear()} GuardMate Platform. All rights reserved.</span>
          <div className="mt-8 md:order-1 md:mt-0 flex items-center gap-2 justify-center md:justify-start">
            <Shield className="h-5 w-5 text-[var(--color-primary)]" />
            <span className="text-lg font-bold text-[var(--color-text-primary)]">GuardMate</span>
          </div>
        </div>
      </footer>
    </div>
  );
}