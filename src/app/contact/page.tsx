'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/landing/Footer';
import { ContactSection } from '@/components/landing/ContactSection';

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />

      <main className="flex-grow">
        {/* Header */}
        <section className="relative overflow-hidden pt-8 pb-5 sm:pt-10 sm:pb-6">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-primary-light),transparent)] opacity-20" />
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Contact Us
            </h1>
            <p className="mt-3 max-w-xl text-base text-[var(--color-text-secondary)]">
              Have questions about GuardMate? We are here to help. Reach out and our team will respond within 24 hours.
            </p>
          </div>
        </section>

        <ContactSection />
      </main>

      <Footer />
    </div>
  );
}
