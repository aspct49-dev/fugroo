import type { AffiliateReturn, Partner, PartnerId, VipTransfer } from './types';

/** Payout per rank, index 0 = 1st. The pool is summed from this, never typed
 *  out separately, so the headline figure and the table cannot disagree. */
const ROOBET_PRIZES = [450, 225, 100, 65, 50, 40, 30, 20, 10, 10];

/**
 * The partner registry. Prize pools, splits and codes live here and nowhere
 * else — a changed prize table is an edit to this file.
 *
 * Ten paying places out of a $1,000 monthly pool. The referral code shown to
 * players is taken from the signup link's own parameter, so the two cannot
 * drift apart, and the pool figure on every page is summed from this table
 * rather than written out anywhere — the two can never disagree.
 */
export const PARTNERS: Record<PartnerId, Partner> = {
  roobet: {
    id: 'roobet',
    name: 'Roobet',
    code: 'Fugroo',
    logo: '/roobet-logo.webp',
    signupUrl: 'https://roobet.com/?ref=fugroo',
    prizePool: ROOBET_PRIZES.reduce((sum, n) => sum + n, 0),
    prizeTable: ROOBET_PRIZES,
    // Roobet weights wagers by game to stop low-edge grinding from farming the
    // board, so the ranked figure is the weighted one, not the raw stake.
    metricLabel: 'Weighted amount wagered',
    hasLiveApi: true,
    blurb: 'Slots, originals, crash and sports. Standings come from the Roobet affiliate API.',
  },
};

export const PARTNER_ORDER: PartnerId[] = ['roobet'];

export function getPartner(id: PartnerId): Partner {
  return PARTNERS[id];
}

/** The headline partner. Single-partner today; the registry keeps it swappable. */
export const PRIMARY_PARTNER = PARTNERS.roobet;

/** Combined pot across every partner — the figure on the nav badge. */
export const TOTAL_PRIZE_POOL = PARTNER_ORDER.reduce(
  (sum, id) => sum + PARTNERS[id].prizePool,
  0,
);

/**
 * How Roobet weights a wager toward the board. Published so the ranking is
 * checkable rather than asserted.
 */
/**
 * How much of a wager counts toward the board.
 *
 * Roobet's own bands, stated in their terms and reproduced here verbatim in
 * meaning — the site must not paraphrase a rule it does not set. Banded on
 * **RTP**, not house edge: the two are inverses and quoting the wrong one is
 * exactly the kind of small error that reads as the board being rigged.
 *
 * Every game counts for something under these bands, dice included. An earlier
 * version of this list was wrong on both the boundaries and the percentages;
 * if Roobet changes them again, this array is the only place to edit.
 */
export const WAGER_WEIGHTS = [
  { band: 'RTP of 97% or lower', weight: '100%', note: 'Most slots and the bulk of the lobby' },
  { band: 'RTP between 97.01% and 98.99%', weight: '50%', note: 'Higher-RTP slots and table games' },
  { band: 'RTP of 99% and over', weight: '10%', note: 'Dice and the lowest-edge originals' },
];

/** Roobet's wording, kept close to theirs because it is their rule. */
export const WAGER_NOTE =
  'Leaderboard wager amounts may differ from your statistics on Roobet, depending on the games you are playing.';

/**
 * PLACEHOLDER mechanics. Roobet's VIP transfer is real and is described on
 * fugroobets.com; the amounts and the timing come from Roobet, not from us, so
 * the UI flags the operational detail as pending.
 */
export const VIP_TRANSFER: VipTransfer = {
  headline: 'VIP transfer',
  requirement: 'Hold a VIP level at another casino and open Roobet under code Fugroo',
  reward: 'Roobet reviews your play and matches you into its VIP programme',
  cadence: 'Reviewed within the first three weeks',
  isPlaceholder: true,
};

/**
 * The affiliate return. The percentage is fixed and real; the mechanics are
 * placeholders pending the client's operational detail.
 */
export const AFFILIATE_RETURN: AffiliateReturn = {
  percentage: 100,
  cadence: 'Monthly',
  method: 'Claimed on this site, paid manually',
  isPlaceholder: true,
};

/**
 * What is actually on offer under the code, in the order the bonuses page
 * lists them. Copy lives here rather than in the page so the two cannot drift
 * apart from the prize table above.
 */
export const OFFERS = [
  {
    id: 'leaderboard',
    title: 'Monthly leaderboard',
    body: `Register using code ${PARTNERS.roobet.code} for access to the monthly wager leaderboard, raffles and milestones.`,
    cta: 'Claim bonus',
    href: PARTNERS.roobet.signupUrl,
    hue: 'var(--hue-cyan)',
    pending: false,
  },
  {
    id: 'vip',
    title: 'VIP transfer',
    body: `Already a VIP somewhere else? Open ${PARTNERS.roobet.name} under the code and they review your play for a matched invitation.`,
    cta: 'How it works',
    href: '/how-it-works',
    hue: 'var(--hue-violet)',
    pending: true,
  },
] as const;

/** Three steps, and the page states them in this order. */
export const JOIN_STEPS = [
  {
    n: 1,
    title: `Sign up on ${PARTNERS.roobet.name}`,
    body: `Head to ${PARTNERS.roobet.name} through the link below and create your account — it takes a minute.`,
  },
  {
    n: 2,
    title: `Use code ${PARTNERS.roobet.code}`,
    body: `Drop ${PARTNERS.roobet.code} into the referral code field when you register, so the account is tied to the community.`,
  },
  {
    n: 3,
    title: 'You’re in',
    body: 'Everything unlocks straight away — the wager leaderboard, raffles, milestones and tournaments.',
  },
] as const;

/**
 * Rank-up rewards, in ladder order.
 *
 * The split matters and the page states it plainly: the *rank* is Roobet's —
 * they set the thresholds and decide when one is reached — but the *reward* is
 * ours, paid out on claim. Nothing here comes from Roobet's balance.
 *
 * The emblems are the operator's own art with the baked-in name and amount
 * cropped off, so those are set here as data — they belong in type that stays
 * sharp and can be corrected without a new bitmap.
 *
 * PLACEHOLDER: six of Roobet's ranks are covered. The rest of the ladder is
 * added by appending to this array, and the page counts and totals itself.
 */
export const RANK_REWARDS = [
  { id: 'silver3', name: 'Silver III', tier: 'silver', reward: 5 },
  { id: 'gold2', name: 'Gold II', tier: 'gold', reward: 10 },
  { id: 'gold3', name: 'Gold III', tier: 'gold', reward: 15 },
  { id: 'gold4', name: 'Gold IV', tier: 'gold', reward: 25 },
  { id: 'emerald1', name: 'Emerald I', tier: 'emerald', reward: 100 },
  { id: 'emerald2', name: 'Emerald II', tier: 'emerald', reward: 150 },
] as const;

/** One accent per tier, so the ladder reads as three bands rather than six
 *  unrelated cards. */
export const TIER_HUE: Record<string, string> = {
  silver: '#9fb2d9',
  gold: '#ffa23d',
  emerald: '#2fe6a7',
};

/** Everything on the ladder, added up. */
export const RANK_REWARD_TOTAL = RANK_REWARDS.reduce((sum, r) => sum + r.reward, 0);

/** The biggest single rank-up. Taken as a maximum rather than as the last
 *  entry, so appending a rank out of order cannot make the page lie. */
export const RANK_REWARD_TOP = Math.max(...RANK_REWARDS.map((r) => r.reward));

/**
 * Claiming a rank reward. Three steps, and the middle one is the whole point:
 * these are paid by us, so there is nothing automatic about it — someone has
 * to ask, and a Discord ticket is where that happens.
 */
export const CLAIM_STEPS = [
  {
    n: 1,
    title: 'Reach a rank',
    body: `Play on ${PARTNERS.roobet.name} under code ${PARTNERS.roobet.code}. Roobet promotes you as your lifetime wagered climbs.`,
  },
  {
    n: 2,
    title: 'Open a ticket',
    body: 'Open a ticket in the Discord with your Roobet username and the rank you have hit.',
  },
  {
    n: 3,
    title: 'Get paid',
    body: 'Once the rank checks out against the affiliate stats, the reward is sent straight to you.',
  },
] as const;

export const SOCIALS = {
  kick: 'https://kick.com/fugroo',
  youtube: 'https://www.youtube.com/@FugrooGambles',
  x: 'https://x.com/Fugroo_',
  instagram: 'https://www.instagram.com/fugroo/',
  discord: 'https://discord.gg/fugroo',
};
