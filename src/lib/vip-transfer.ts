import 'server-only';

import { MAX_FILE_BYTES } from './vip-transfer.shared';

/**
 * VIP transfer applications.
 *
 * Someone already holding a VIP level at another casino applies to have it
 * matched on Roobet under the code. The application is a claim about play that
 * happened somewhere we cannot see, so it comes with screenshots, and a person
 * reads it — this does not approve anything, it delivers the case.
 *
 * **Nothing is stored.** The form posts, the images go straight to Discord as
 * attachments, and the request ends. That is deliberate: the only thing anyone
 * does with an application is read it and reply in Discord, so keeping a copy
 * would mean holding other people's account screenshots on a VPS for no use at
 * all. The webhook is the record.
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

/**
 * Five applications per address per fifteen minutes.
 *
 * In memory, which is the same trade the raffle makes and carries the same
 * caveat: it resets on a redeploy and would not hold across two processes.
 * For a form a handful of people fill in a week that is proportionate — the
 * job here is stopping somebody emptying their camera roll into the channel,
 * not surviving a determined flood.
 */
const seen = new Map<string, { count: number; until: number }>();
const WINDOW = 15 * 60_000;
const LIMIT = 5;

export function rateLimited(ip: string): boolean {
  const now = Date.now();
  const record = seen.get(ip);
  if (!record || now > record.until) {
    seen.set(ip, { count: 1, until: now + WINDOW });
    return false;
  }
  record.count += 1;
  return record.count > LIMIT;
}
