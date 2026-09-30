'use client';

import { useState } from 'react';

/**
 * A URL to paste somewhere else, with a button that copies it.
 *
 * The address is a read-only input rather than text, so it can still be
 * selected by hand where the clipboard is unavailable — plain HTTP, or a
 * browser that refuses — and so a long one scrolls instead of wrapping.
 */
export function CopyUrl({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // The field is selectable; see above.
    }
  }

  return (
    <div className="ovl-url">
      <input
        value={url}
        readOnly
        aria-label={label}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="btn btn-secondary btn-sm" onClick={copy} aria-live="polite">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
