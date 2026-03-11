import { Navbar } from '@/components/Navbar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg-base)]">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
