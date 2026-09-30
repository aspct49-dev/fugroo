import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { AdminNav } from '@/components/AdminNav';
import { requireAdmin } from '@/lib/admin';
import { STORE_KIND, storeWritable } from '@/lib/store';

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

  // Asked once here rather than in each tool: every one of them writes, and
  // every one of them fails the same way. Finding that out by pressing Save
  // and getting a server error is the worst possible time to learn it.
  const writable = await storeWritable();

  return (
    <section className="section wrap">
      <header className="admin-head">
        <h1 className="h-page">Admin</h1>
        <p className="lede" style={{ marginTop: 10 }}>
          Signed in as {session.user?.name}. Everything here is live the moment it is saved.
        </p>
      </header>

      <AdminNav />

      {!writable && (
        <div className="admin-alarm">
          <h2 className="h-section">Nothing here can save</h2>
          <p>
            The store is not writable, so creating a tournament, opening a guess round or linking a
            Roobet account will fail.{' '}
            {STORE_KIND === 'files'
              ? 'It is using local files, which works on a VPS and cannot work on a serverless host — there is no writable disk. Connect a KV store (Vercel KV or Upstash) and redeploy; store.ts switches over on its own once KV_REST_API_URL and KV_REST_API_TOKEN are set.'
              : 'It is configured for KV but the write was refused — check KV_REST_API_URL and KV_REST_API_TOKEN, then redeploy.'}
          </p>
          <p className="admin-note" style={{ marginTop: 10 }}>
            Reading still works, so everything below shows real data. It is saving that will not.
          </p>
        </div>
      )}

      {children}
    </section>
  );
}
