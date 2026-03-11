import { redirect } from 'next/navigation';

// Admin root redirects to dashboard
export default function AdminPage() {
  redirect('/admin/dashboard');
}
