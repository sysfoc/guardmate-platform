import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/landing/Footer';

export const metadata = {
  title: 'Terms & Conditions | GuardMate',
  description: 'GuardMate Platform Terms of Service and Conditions of Use.',
};

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />

      <main className="flex-grow">
        <section className="pt-8 pb-5 sm:pt-10 sm:pb-6">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <Link href="/" className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-primary)] transition-colors mb-6">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Terms & Conditions
            </h1>
            <p className="mt-4 text-lg text-[var(--color-text-secondary)]">
              Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </section>

        <section className="pb-10 sm:pb-12">
          <div className="mx-auto max-w-3xl px-6 lg:px-8">
            <div className="max-w-none text-[var(--color-text-secondary)] space-y-2">
              <p className="text-base leading-7">
                Please read these Terms and Conditions carefully before using the GuardMate platform.
                By accessing or using GuardMate, you agree to be bound by these terms.
              </p>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">1. Definitions</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li><strong>"Platform"</strong> means the GuardMate website, applications, and services.</li>
                <li><strong>"User"</strong> means any person who registers for or uses the Platform, including both Guards and Businesses.</li>
                <li><strong>"Guard"</strong> or <strong>"Security Professional"</strong> means a User who provides security services through the Platform.</li>
                <li><strong>"Business"</strong> or <strong>"Client"</strong> means a User who posts security jobs or shifts through the Platform.</li>
                <li><strong>"Shift"</strong> or <strong>"Job"</strong> means a specific security assignment posted by a Business and accepted by a Guard.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">2. Eligibility & Registration</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>You must be at least 18 years old to use the Platform.</li>
                <li>Guards must hold a valid security licence in the jurisdiction where they intend to work.</li>
                <li>All information provided during registration must be accurate, current, and complete.</li>
                <li>We reserve the right to suspend or terminate accounts that contain false or misleading information.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">3. Guard Obligations</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>Guards must arrive on time, in uniform (where required), and professionally present for every accepted Shift.</li>
                <li>Guards must comply with all site-specific instructions, post orders, and safety protocols.</li>
                <li>Incident reports and Daily Activity Reports (DARs) must be submitted accurately and promptly.</li>
                <li>Guards must maintain valid licences, first aid certifications, and any other required credentials.</li>
                <li>Subcontracting or sending a replacement without Business approval is strictly prohibited.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">4. Business Obligations</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>Businesses must provide accurate job descriptions, location details, and shift requirements.</li>
                <li>Businesses must ensure all posted shifts comply with applicable labour laws and regulations.</li>
                <li>Payments must be deposited into escrow before a Guard begins work.</li>
                <li>Shift approvals and dispute resolution must be handled within 48 hours of shift completion.</li>
                <li>Businesses may not solicit Guards for off-platform work during the first 12 months of engagement.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">5. Payments & Escrow</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>All payments for shifts must be processed through the Platform's escrow system.</li>
                <li>Funds are held in escrow and released to the Guard upon Business approval of shift completion.</li>
                <li>Guards may request withdrawal of available funds to their linked bank account.</li>
                <li>Platform fees are calculated per transaction and displayed before payment confirmation.</li>
                <li>Chargebacks or payment disputes are handled according to our Dispute Resolution Policy.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">6. Ratings & Reviews</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>Both Guards and Businesses may leave reviews after a completed Shift.</li>
                <li>Reviews must be honest, factual, and based on the actual work performed.</li>
                <li>We reserve the right to remove reviews that contain hate speech, threats, or false information.</li>
                <li>Ratings affect profile visibility and platform privileges.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">7. Privacy & Data</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>We collect and process personal data in accordance with our Privacy Policy.</li>
                <li>Users consent to licence verification checks and background screening where applicable.</li>
                <li>Location data is collected during active shifts for safety and verification purposes only.</li>
                <li>Users may request deletion of their personal data by contacting support.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">8. Dispute Resolution</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>Users must first attempt to resolve disputes directly through the Platform messaging system.</li>
                <li>If unresolved, either party may escalate to GuardMate's dispute resolution team within 7 days.</li>
                <li>GuardMate's decision on escrow release is final and binding.</li>
                <li>Serious breaches may result in account suspension or permanent ban.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">9. Liability Disclaimer</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>GuardMate is a technology platform connecting Guards and Businesses. We are not an employer, security agency, or insurer.</li>
                <li>Businesses are responsible for ensuring their security requirements are appropriate and lawful.</li>
                <li>Guards are independent contractors responsible for their own conduct and professional standards.</li>
                <li>GuardMate is not liable for any loss, damage, or injury arising from services performed through the Platform.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">10. Termination</h2>
              <ul className="list-disc pl-5 space-y-1 text-sm leading-6">
                <li>Users may terminate their account at any time by contacting support.</li>
                <li>GuardMate may suspend or terminate accounts for breaches of these Terms, fraud, or illegal activity.</li>
                <li>Upon termination, any pending payments will be processed according to the payment schedule.</li>
                <li>Certain provisions (liability, indemnity, data) survive termination.</li>
              </ul>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">11. Changes to Terms</h2>
              <p className="text-sm leading-6">
                We may update these Terms from time to time. Significant changes will be communicated via email and posted on the Platform.
                Continued use of the Platform after changes constitutes acceptance of the revised Terms.
              </p>

              <h2 className="text-xl font-bold text-[var(--color-text-primary)] mt-4 mb-2">12. Contact</h2>
              <p className="text-sm leading-6">
                For questions about these Terms, please contact us at{' '}
                <a href="mailto:support@guardmate.com" className="text-[var(--color-primary)] hover:underline font-medium">
                  support@guardmate.com
                </a>{' '}
                or visit our{' '}
                <Link href="/contact" className="text-[var(--color-primary)] hover:underline font-medium">
                  Contact Page
                </Link>.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
