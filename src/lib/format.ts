/** Formatting and masking. Shared by providers and components. */

/**
 * Usernames are masked to their last four characters — the convention across
 * casino affiliate leaderboards, and the reason providers never hand a full
 * name to the UI.
 */
export function maskUsername(name: string | null | undefined): string {
  if (!name) return '****';
  if (name.length <= 4) return '*'.repeat(4) + name;
  return '*'.repeat(Math.min(name.length - 4, 8)) + name.slice(-4);
}

/** Wagers run to five figures; the cents are noise. */
export function formatMoney(n: number, opts: { cents?: boolean } = {}): string {
  /*
   * Something under a cent, but not nothing.
   *
   * This used to print the real figure to four places, for bonus hunts, where
   * a 138x off a third of a cent is the interesting part. That section is
   * gone, and on a leaderboard the same rule put "$0.0072" in a column next to
   * "$6,448.82" — which reads as a rendering fault, not as a small number.
   * "$0.00" would be worse: it says they wagered nothing while a prize sits
   * beside it. So say what is actually true and say it at the column's own
   * precision.
   */
  if (opts.cents && n > 0 && n < 0.01) return '<$0.01';
  return (
    '$' +
    n.toLocaleString('en-US', {
      minimumFractionDigits: opts.cents ? 2 : 0,
      maximumFractionDigits: opts.cents ? 2 : 0,
    })
  );
}

export function formatMultiplier(n: number): string {
  return (n >= 100 ? Math.round(n) : Number(n.toFixed(2))).toLocaleString('en-US') + '×';
}

/** The current calendar month, which is the leaderboard period. */
export function currentPeriod(now: Date = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0) - 1000);
  return { start, end };
}

export function periodLabel(start: string): string {
  return new Date(start).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
