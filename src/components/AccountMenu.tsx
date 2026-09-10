'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Who is signed in, and the way out.
 *
 * A disclosure rather than a hover menu: the only item in it signs you out,
 * and an action that ends your session should not be reachable by the pointer
 * drifting across it. Escape closes it, a click outside closes it, and focus
 * returns to the trigger — a menu that traps focus on a phone is worse than no
 * menu at all.
 */
export function AccountMenu({ name, image }: { name: string; image: string | null }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    function onDown(e: MouseEvent) {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    }

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  return (
    <div className="account" ref={box}>
      <button
        className="account-btn"
        ref={trigger}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span className="account-avatar">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Discord CDN avatar
            <img src={image} alt="" width={26} height={26} />
          ) : (
            <span className="account-initial">{name.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <span className="account-name">{name}</span>
      </button>

      {open && (
        <div className="account-menu" role="menu">
          <a className="account-menu-item" href="/profile" role="menuitem">
            My account
          </a>
          <form action="/api/auth/signout" method="post">
            <button className="account-menu-item" type="submit" role="menuitem">
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
