/**
 * Domain types. No React, no fetch, no UI concerns — these are the shapes every
 * partner provider must normalise down to, so the leaderboard components never
 * learn which casino a row came from.
 */

export type PartnerId = 'roobet';

/** Whether the numbers on screen came from a real API or from a fallback. */
export type DataSource = 'live' | 'mock';

export interface Partner {
  id: PartnerId;
  name: string;
  /** Referral code the player types at signup. */
  code: string;
  /** Operator's own brand mark, served from /public. */
  logo: string;
  signupUrl: string;
  /** Total pot for the current period, in whole dollars. */
  prizePool: number;
  /** Payout per rank, index 0 = 1st. Length defines how many seats pay. */
  prizeTable: number[];
  /** What the ranking is measured on, stated verbatim in the rules copy. */
  metricLabel: string;
  /** True once a real API is wired up; drives the UNOFFICIAL badge in the UI. */
  hasLiveApi: boolean;
  blurb: string;
}

export interface LeaderboardEntry {
  rank: number;
  /** Masked for display — providers must never return a full username. */
  username: string;
  /** The figure the board is ranked on. Roobet weights this by game. */
  wagered: number;
  prize: number;
  favouriteGame?: string;
  /** Partner's own player-tier badge, if it publishes one. */
  tierBadgeUrl?: string;
  /** A paying seat nobody has taken yet. */
  unclaimed: boolean;
}

/** Whole-board aggregates, computed from every player, not just the paid places. */
export interface BoardStats {
  players: number;
  totalWagered: number;
  topWager: number;
}

export interface Leaderboard {
  partnerId: PartnerId;
  prizePool: number;
  /** Always prizeTable.length long — unfilled seats come back unclaimed. */
  entries: LeaderboardEntry[];
  periodStart: string;
  periodEnd: string;
  updatedAt: string;
  source: DataSource;
  stats: BoardStats;
  /** Set when the live provider failed and an empty board was served instead. */
  error?: string;
}

/** What every partner integration implements. Adding a casino = adding one of these. */
export interface LeaderboardProvider {
  readonly partnerId: PartnerId;
  fetchLeaderboard(period: Period): Promise<Leaderboard>;
}

export interface Period {
  start: Date;
  end: Date;
}

/**
 * Roobet's VIP transfer. A player who already has a VIP level elsewhere can have
 * it matched, which is a separate offer from the leaderboard.
 */
export interface VipTransfer {
  headline: string;
  requirement: string;
  reward: string;
  cadence: string;
  isPlaceholder: boolean;
}

export interface AffiliateReturn {
  /** Share of affiliate revenue returned to players. */
  percentage: number;
  cadence: string;
  method: string;
  isPlaceholder: boolean;
}

/**
 * A destination on the home page card rack.
 *
 * `motion` is the optional animation layer that crossfades in on hover. It is
 * a URL to whatever the media slot should render — today a looping video,
 * tomorrow a Rive file — and the card treats it as opaque. When it is absent
 * the still keeps its own ambient drift, so a card without an animation is
 * not a card that looks broken.
 */
export interface SectionCard {
  id: string;
  label: string;
  href: string;
  /** CSS colour, usually a var() reference into the hue set. */
  hue: string;
  /**
   * Optional animation layer that crossfades in over the drawn art on hover.
   * A URL to whatever the media slot should render — a looping video today, a
   * Rive file tomorrow — and the card treats it as opaque. The artwork itself
   * is drawn in `CardArt`, keyed on `id`.
   */
  motion?: string;
  /** One line, used where the card is listed rather than shown. */
  blurb: string;
}
