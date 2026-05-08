'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle2, Loader2, MessageSquare, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setSent(true);
      setForm({ name: '', email: '', subject: 'general', message: '' });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-1 sm:pb-2">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-4">
          <h2 className="text-sm font-bold leading-6 text-[var(--color-primary)] uppercase tracking-wider">Contact Us</h2>
          <p className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">Need help? We are here.</p>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">Reach out and our team will respond within 24 hours.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 lg:gap-6">
          {/* Sidebar info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)] mb-3">Get in touch</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-light)] flex-shrink-0">
                    <Mail className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">Email</p>
                    <a href="mailto:support@guardmate.com" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">support@guardmate.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-light)] flex-shrink-0">
                    <Phone className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">Phone</p>
                    <a href="tel:130048273" className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors">1300 GUARD (48273)</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary-light)] flex-shrink-0">
                    <MapPin className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--color-text-primary)]">Location</p>
                    <p className="text-xs text-[var(--color-text-secondary)]">Operating Nationwide</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-[var(--color-primary)]" aria-hidden="true" />
                <p className="text-sm font-bold text-[var(--color-text-primary)]">Support Hours</p>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Monday — Friday: 8:00 AM — 6:00 PM<br />
                Emergency support available for active shifts.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="lg:col-span-3 min-h-[540px]">
            {sent ? (
              <div className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm flex flex-col items-center justify-center h-full">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-success-light)] mb-3">
                  <CheckCircle2 className="h-6 w-6 text-[var(--color-success)]" aria-hidden="true" />
                </div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-1">Message Sent!</h3>
                <p className="text-xs text-[var(--color-text-secondary)] mb-4">Thanks for reaching out. Our team will get back to you within 24 hours.</p>
                <Button onClick={() => setSent(false)} variant="outline" size="sm">Send Another Message</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-xl border border-[var(--color-surface-border)] bg-[var(--color-surface)] p-5 sm:p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contact-name" className="block text-[10px] font-bold text-[var(--color-input-label)] uppercase tracking-wider mb-1.5">Full Name *</label>
                    <input id="contact-name" type="text" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] transition-all" placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-[10px] font-bold text-[var(--color-input-label)] uppercase tracking-wider mb-1.5">Email Address *</label>
                    <input id="contact-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] transition-all" placeholder="you@company.com" />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-[10px] font-bold text-[var(--color-input-label)] uppercase tracking-wider mb-1.5">Subject *</label>
                  <select id="contact-subject" required value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] transition-all">
                    <option value="general">General Enquiry</option>
                    <option value="guard">I want to register as a Guard</option>
                    <option value="business">I want to post jobs as a Business</option>
                    <option value="enterprise">Enterprise / Custom Solution</option>
                    <option value="support">Technical Support</option>
                    <option value="billing">Billing Question</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-[10px] font-bold text-[var(--color-input-label)] uppercase tracking-wider mb-1.5">Message *</label>
                  <textarea id="contact-message" required rows={4} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-base)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-focus)] transition-all resize-none" placeholder="How can we help you?" />
                </div>

                <div className="min-h-[20px]">
                  {error && <p className="text-xs text-[var(--color-danger)]">{error}</p>}
                </div>

                <Button type="submit" size="md" className="w-full sm:w-auto" disabled={loading} rightIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}>
                  {loading ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
