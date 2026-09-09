/**
 * The handful of glyphs the interface draws itself.
 *
 * Everything platform-branded (Kick, Discord, X, YouTube, Instagram) comes
 * from react-icons instead — those marks belong to their owners and are not
 * ours to redraw.
 */

type Props = { className?: string };

export function TrophyIcon({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M18 3h2.5A1.5 1.5 0 0 1 22 4.5v1A5.5 5.5 0 0 1 17 11a5 5 0 0 1-4 3.9V18h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-3.1A5 5 0 0 1 7 11a5.5 5.5 0 0 1-5-5.5v-1A1.5 1.5 0 0 1 3.5 3H6V2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1zM6 5H4v.5A3.5 3.5 0 0 0 6.4 8.8 12 12 0 0 1 6 6zm12 0v1a12 12 0 0 1-.4 2.8A3.5 3.5 0 0 0 20 5.5V5z" />
    </svg>
  );
}

/** The hexagon that runs through the artwork, used as a small marker. */
export function HexIcon({ className }: Props) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden focusable="false">
      <path d="M12 1.5 21.5 7v10L12 22.5 2.5 17V7z" />
    </svg>
  );
}

export function CopyIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

/** Marks an action that leaves the site. */
export function ExternalIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M14 4h6v6M20 4l-9 9" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </svg>
  );
}

/** Step one: opening an account. */
export function UserPlusIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M18 8v6M21 11h-6" />
    </svg>
  );
}

/** Step two: entering the code. */
export function TagIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** The last step of a claim: it has been paid. */
export function PaidIcon({ className }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </svg>
  );
}
