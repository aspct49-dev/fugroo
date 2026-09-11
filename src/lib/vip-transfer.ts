import 'server-only';

import { createHash } from 'node:crypto';

import { mutateJson } from './store';
import { MAX_FILE_BYTES } from './vip-transfer.shared';

/**
 * VIP transfer applications.
 *
 * Someone already holding a VIP level at another casino applies to have it
 * matched on Roobet under the code. The application is a claim about play that
 * happened somewhere we cannot see, so it comes with screenshots, and a person
 * reads it — this does not approve anything, it delivers the case.
 *
 * **None of the application is stored.** The form posts, the images go straight
 * to Discord as attachments, and the request ends. That is deliberate: the only
 * thing anyone does with an application is read it and reply in Discord, so
 * keeping a copy would mean holding other people's account screenshots on a VPS
 * for no use at all. The webhook is the record.
 *
 * The one thing that is written down is a hashed identity and a timestamp, so
 * the same person cannot send it thirty times. That ledger cannot be read back
 * into a person and holds nothing they typed.
 */

/* Re-exported so server callers have one import, not two. The values live in
   the shared file because the form needs them too and cannot import from a
   `server-only` module.

   The size cap is under Discord's own rather than at it: an upload over its
   limit comes back as a 413 with nothing useful in it. */
export { LOSSBACK_OPTIONS, MAX_FILES, MAX_FILE_BYTES, type Lossback } from './vip-transfer.shared';
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const;

/**
 * The first bytes each format must start with.
 *
 * A browser reports whatever `Content-Type` it likes, and an attacker reports
 * whatever they like. Checking the actual bytes is what stops something that
 * is not an image being handed to Discord with an image's name on it.
 */
const MAGIC: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};

/** Trims anything that could change how the text reads once it is inside a
 *  Discord embed, and caps the length. */
export function clean(input: string, max = 100): string {
  return input
    .replace(/[<>@]/g, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/`/g, "'")
    .trim()
    .slice(0, max);
}

/**
 * Everything in one submission, together.
 *
 * Ten files at the per-file limit is eighty megabytes, which nobody needs to
 * prove a VIP tier and which Discord would refuse anyway — better to say so
 * before reading the whole upload than after.
 */
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export function checkTotalSize(files: File[]): string | null {
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_BYTES) {
    return `That is ${(total / 1024 / 1024).toFixed(0)}MB of screenshots. Keep it under ${MAX_TOTAL_BYTES / 1024 / 1024}MB in total.`;
  }
  return null;
}

export async function checkImage(file: File): Promise<string | null> {
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return `${file.name}: only JPG, PNG and WEBP images are accepted.`;
  }
  if (file.size > MAX_FILE_BYTES) {
    return `${file.name}: over the 8MB limit.`;
  }
  if (file.size === 0) return `${file.name}: that file is empty.`;

  const bytes = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const signatures = MAGIC[file.type];
  if (!signatures?.some((sig) => sig.every((b, i) => bytes[i] === b))) {
    return `${file.name}: that is not the kind of file it says it is.`;
  }
  return null;
}

export interface Application {
  roobetName: string;
  /** Taken from the session where there is one, typed where there is not. */
  discord: string;
  games: string;
  lossback: string;
  kycHelp: string;
  notes: string;
  recent: File[];
  lifetime: File[];
}

/**
 * Discord will not accept a filename with anything unusual in it, and the
 * originals come from whatever the applicant's phone called them.
 */
function safeName(name: string, prefix: string, i: number): string {
  const base = (name.split(/[\\/]/).pop() ?? 'image')
    .replace(/[^A-Za-z0-9.\-_ ]/g, '_')
    .replace(/_+/g, '_')
    .slice(-40);
  return `${prefix}-${i + 1}-${base}`;
}

export async function deliver(app: Application): Promise<{ ok: boolean; error?: string }> {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) return { ok: false, error: 'No webhook configured.' };

  const embed = {
    title: 'VIP transfer application',
    color: 0x22d3ff,
    fields: [
      { name: 'Roobet name', value: `\`${app.roobetName}\``, inline: true },
      { name: 'Discord', value: app.discord ? `\`${app.discord}\`` : 'Not given', inline: true },
      { name: 'Current lossback', value: `\`${app.lossback}\``, inline: true },
      { name: 'Games played', value: app.games || 'Not given', inline: false },
      { name: 'Wants KYC help', value: app.kycHelp, inline: true },
      { name: 'Proof', value: `${app.recent.length} recent, ${app.lifetime.length} lifetime`, inline: true },
      ...(app.notes ? [{ name: 'Notes', value: app.notes, inline: false }] : []),
    ],
    footer: { text: 'fugroobets.com' },
    timestamp: new Date().toISOString(),
  };

  const form = new FormData();
  form.append('payload_json', JSON.stringify({ embeds: [embed] }));

  const files = [
    ...app.recent.map((f, i) => [f, safeName(f.name, 'recent', i)] as const),
    ...app.lifetime.map((f, i) => [f, safeName(f.name, 'lifetime', i)] as const),
  ];
  files.forEach(([file, name], i) => form.append(`files[${i}]`, file, name));

  try {
    const res = await fetch(webhook, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[vip] webhook rejected:', res.status, body.slice(0, 200));
      return { ok: false, error: `Discord returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('[vip] webhook threw:', err);
    return { ok: false, error: 'Could not reach Discord' };
  }
}

/* -------------------------------------------------------------- spam */

/**
 * Two limits, because they stop different things.
 *
 * The burst limit is per address and lives in memory: five attempts in fifteen
 * minutes, which is about stopping a script hammering the endpoint. It resets
 * on a redeploy and would not hold across two processes, and that is fine —
 * nothing depends on it being exact.
 *
 * The standing limit is per *person* and lives in the store: three delivered
 * applications a day. That is the one that matters, because the burst limit is
 * defeated by switching from wifi to mobile data, and a VIP transfer is a
 * once-off — three is room to correct a bad screenshot, not a rate.
 */
const burst = new Map<string, { count: number; until: number }>();
const BURST_WINDOW = 15 * 60_000;
const BURST_LIMIT = 5;

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const record = burst.get(ip);
  if (!record || now > record.until) {
    burst.set(ip, { count: 1, until: now + BURST_WINDOW });
    return false;
  }
  record.count += 1;
  return record.count > BURST_LIMIT;
}

const LEDGER = 'vip-applications.json';
const DAY = 24 * 60 * 60_000;
const PER_DAY = 3;

interface Ledger {
  /** `{ k: hashed identity, at: epoch ms }`. Nothing else. */
  sent: { k: string; at: number }[];
}

/**
 * Who an application counts against.
 *
 * The Discord id where there is one, because that is the person and it follows
 * them across networks. The address otherwise, which is weaker — shared wifi
 * counts as one applicant — but it is the only handle an anonymous submission
 * has, and the burst limit already assumes as much.
 *
 * Hashed before it is written. The ledger exists to answer "has this one
 * applied today", and that question does not need the identity back, so there
 * is no reason to keep a file of people's addresses to answer it.
 */
function identity(discordId: string | null, ip: string): string {
  const raw = discordId ? `d:${discordId}` : `i:${ip}`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

/**
 * How long until they may apply again, in ms, or null if they may now.
 *
 * Old entries are dropped on the way past. The ledger is only ever read to
 * answer this question, so there is nowhere else to prune it from and no
 * reason to keep anything older than the window.
 */
export async function applyCooldown(
  discordId: string | null,
  ip: string,
): Promise<number | null> {
  const key = identity(discordId, ip);
  const now = Date.now();
  let wait: number | null = null;

  await mutateJson<Ledger>(LEDGER, { sent: [] }, (l) => {
    l.sent = l.sent.filter((e) => now - e.at < DAY);
    const mine = l.sent.filter((e) => e.k === key).sort((a, b) => a.at - b.at);
    if (mine.length >= PER_DAY) wait = mine[0].at + DAY - now;
  });

  return wait;
}

/** Recorded only once Discord has actually taken it. A delivery that failed is
 *  not an application, and charging someone for it would lock them out over
 *  our outage. */
export async function recordApplication(discordId: string | null, ip: string): Promise<void> {
  const key = identity(discordId, ip);
  await mutateJson<Ledger>(LEDGER, { sent: [] }, (l) => {
    l.sent.push({ k: key, at: Date.now() });
  });
}

/** Rounds a wait down to something worth saying out loud. */
export function describeWait(ms: number): string {
  const hours = Math.ceil(ms / 3_600_000);
  if (hours <= 1) return 'in about an hour';
  return `in about ${hours} hours`;
}
