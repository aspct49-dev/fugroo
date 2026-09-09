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
  // A big multiplier is usually hit off a tiny stake — a 138× on a third of a
  // cent rounds to "$0.00", which reads as broken rather than as impressive.
  if (opts.cents && n > 0 && n < 0.01) {
    return '$' + n.toFixed(4).replace(/0+$/, '');
  }
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
