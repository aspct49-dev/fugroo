import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';

/**
 * The shell every admin route sits in.
 *
 * The session check lives here so it cannot be forgotten when a tool is added
 * — a new page under `/admin` is gated the moment it exists. That is still the
 * second of the three layers, not the last one: the nav entry hiding is a
 * courtesy, this redirect is a convenience, and the check inside each server
 * action is the control. A form post does not render a layout.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Admin' },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, admin } = await requireAdmin();

  // Not signed in and signed in without access are different problems with
  // different fixes, so they go to different places.
  if (!session) redirect('/login');
  if (!admin) redirect('/');

  return (
    <section className="section wrap">
      <header className="admin-head">
        <h1 className="h-page">Admin</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Signed in as {session.user?.name}. Everything here is live the moment it is saved.
        </p>
      </header>

      <AdminNav />

      {children}
    </section>
  );
}
