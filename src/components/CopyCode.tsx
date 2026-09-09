'use client';

import { useState } from 'react';

import { CopyIcon } from './icons';

/**
 * The referral code, click to copy.
 *
 * The label stays "Copy" until it has actually copied, and then says
 * "Copied" — the button's name matches what happened, so nobody has to guess
 * whether it worked.
 */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // The clipboard is unavailable over plain HTTP and in some browsers.
      // The code is on screen regardless, so failing quietly is right here —
      // an error message would be about the browser, not about the code.
    }
  }

  return (
    <button className="code-copy" onClick={copy} aria-label={`Copy referral code ${code}`}>
      <span className="code-copy-key">Code</span>
      <span className="code-copy-val">{code}</span>
      <span className="code-copy-state" aria-live="polite">
        {copied ? 'Copied' : <CopyIcon />}
      </span>
    </button>
  );
}
