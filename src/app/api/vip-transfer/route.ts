import { NextResponse, type NextRequest } from 'next/server';

import { auth } from '@/lib/auth';
import {
  applyCooldown,
  checkImage,
  checkTotalSize,
  clean,
  deliver,
  describeWait,
  LOSSBACK_OPTIONS,
  MAX_FILES,
  rateLimited,
  recordApplication,
  type Lossback,
} from '@/lib/vip-transfer';

/**
 * Takes a VIP transfer application and hands it to Discord.
 *
 * Everything is re-checked here. The form does its own validation so nobody
 * waits for a round trip to learn they forgot a screenshot, but a form is a
 * convenience and this is the rule: the sizes, the types, the actual bytes of
 * each file, and the number of them.
 */

export const dynamic = 'force-dynamic';

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (rateLimited(ip)) {
    return bad('That is a lot of applications. Try again in fifteen minutes.', 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad('That form did not arrive in one piece. Try again.');
  }

  /*
   * The honeypot. A field that is hidden, unlabelled and skipped by tab, so a
   * person never reaches it and a script filling every input does.
   *
   * Answered with the ordinary success shape on purpose: a bot told it failed
   * tries something else, whereas one told it worked goes away. The cost of
   * being wrong is a submission silently dropped, which is why the field is
   * `autocomplete="off"` and named nothing a password manager would recognise.
   */
  if (String(form.get('company') ?? '').trim()) {
    console.warn('[vip] honeypot filled, dropping submission');
    return NextResponse.json({ ok: true });
  }

  const roobetName = clean(String(form.get('roobetName') ?? ''), 40);
  if (roobetName.length < 2) return bad('Enter the Roobet username you play under.');

  const games = clean(String(form.get('games') ?? ''), 120);
  if (!games) return bad('Tell us what you mostly play.');

  const lossback = String(form.get('lossback') ?? '');
  if (!LOSSBACK_OPTIONS.includes(lossback as Lossback)) {
    return bad('Pick your current lossback level.');
  }

  const kycRaw = String(form.get('kycHelp') ?? '');
  const kycHelp = kycRaw === 'yes' ? 'Yes' : kycRaw === 'no' ? 'No' : 'Not said';

  /* The signed-in identity wins over anything typed. It is the handle they
     will actually be replied to on, and one they cannot mistype. */
  const session = await auth();
  const discord = session?.user?.name
    ? clean(session.user.name, 40)
    : clean(String(form.get('discord') ?? ''), 40);
  if (!discord) return bad('Sign in, or tell us your Discord handle so we can reply.');

  const recent = form.getAll('recent').filter((f): f is File => f instanceof File && f.size > 0);
  const lifetime = form.getAll('lifetime').filter((f): f is File => f instanceof File && f.size > 0);

  if (recent.length === 0) return bad('Add at least one screenshot of your last 30 days.');
  if (lifetime.length === 0) return bad('Add at least one screenshot of your lifetime wagered.');
  if (recent.length > MAX_FILES || lifetime.length > MAX_FILES) {
    return bad(`Up to ${MAX_FILES} images per section.`);
  }

  const oversize = checkTotalSize([...recent, ...lifetime]);
  if (oversize) return bad(oversize);

  for (const file of [...recent, ...lifetime]) {
    const problem = await checkImage(file);
    if (problem) return bad(problem);
  }

  /* Checked after validation, so a rejected submission does not count against
     someone's daily allowance — they have not applied, they have made a
     mistake, and the two should not cost the same. */
  const wait = await applyCooldown(session?.user?.discordId ?? null, ip);
  if (wait !== null) {
    return bad(
      `You have already applied today. If something was wrong with it, say so in Discord — otherwise try again ${describeWait(wait)}.`,
      429,
    );
  }

  const result = await deliver({
    roobetName,
    discord,
    games,
    lossback,
    kycHelp,
    notes: clean(String(form.get('notes') ?? ''), 500),
    recent,
    lifetime,
  });

  if (!result.ok) {
    // The applicant cannot do anything about this one, so it does not read as
    // though they got something wrong.
    return NextResponse.json(
      { error: 'We could not deliver that just now. Try again in a minute.' },
      { status: 502 },
    );
  }

  await recordApplication(session?.user?.discordId ?? null, ip);
  return NextResponse.json({ ok: true });
}
