'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * What a thrown server error looks like instead of Vercel's grey page.
 *
 * Next catches a failed render *or a failed server action* at the nearest
 * error boundary, and without one the visitor gets "Application error: a
 * server-side exception has occurred" and a digest — which tells them nothing
 * and tells us only slightly more.
 *
 * The digest is still shown, deliberately: it is the only handle that ties
 * what someone saw to a line in the platform logs, and "it broke" without one
 * is unactionable. The message itself is not shown, because a raw error can
 * carry a file path, a query, or a token.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The server has already logged this; this is for whoever has devtools
    // open on the page it happened on.
    console.error('[error boundary]', error);
  }, [error]);

  return (
    <section className="section wrap">
      <div className="hunt-empty card">
        <h1 className="h-page">Something broke</h1>
        <p className="lede" style={{ marginTop: 12 }}>
          That did not work, and the fault is ours rather than yours. Nothing you were part-way
          through has been lost — try it again, and if it keeps happening the reference below is
          what identifies it in the logs.
        </p>

        {error.digest && (
          <p className="admin-note" style={{ marginTop: 16 }}>
            Reference: <code>{error.digest}</code>
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 26 }}>
          <button className="btn btn-primary" type="button" onClick={reset}>
            Try Again
          </button>
          <Link className="btn btn-quiet" href="/">
            Back Home
          </Link>
        </div>
      </div>
    </section>
  );
}
