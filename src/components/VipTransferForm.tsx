'use client';

import { useRef, useState } from 'react';

import { LOSSBACK_OPTIONS, MAX_FILES } from '@/lib/vip-transfer.shared';

/**
 * The VIP transfer application.
 *
 * A client component because it has to say something useful before the request
 * finishes: which files are attached, that it is sending, and what came back.
 * A plain form post would leave the applicant staring at a spinner having
 * uploaded ten megabytes on faith.
 *
 * It validates the obvious things itself, and the server validates all of them
 * again. That is not duplication for its own sake — the checks here exist so
 * nobody waits for a round trip to learn they forgot a screenshot, and the ones
 * on the server exist because a form is a convenience and cannot be trusted.
 */

interface Props {
  /** Prefilled from the signed-in profile where there is one. */
  roobetName: string;
  /** Their Discord handle, if signed in. Absent means ask for it. */
  discord: string | null;
}

interface Picked {
  files: File[];
  error: string | null;
}

const EMPTY: Picked = { files: [], error: null };

export function VipTransferForm({ roobetName, discord }: Props) {
  const [recent, setRecent] = useState<Picked>(EMPTY);
  const [lifetime, setLifetime] = useState<Picked>(EMPTY);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const pick = (set: (p: Picked) => void) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > MAX_FILES) {
      set({ files: files.slice(0, MAX_FILES), error: `Only the first ${MAX_FILES} are used.` });
      return;
    }
    set({ files, error: null });
  };

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (recent.files.length === 0 || lifetime.files.length === 0) {
      setError('Both sets of screenshots are needed — recent play and lifetime wagered.');
      return;
    }

    setSending(true);
    try {
      const body = new FormData(event.currentTarget);
      const res = await fetch('/api/vip-transfer', { method: 'POST', body });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? 'That did not go through. Try again.');
        return;
      }
      setDone(true);
    } catch {
      // A dropped upload and a rejected one read the same from here, so say
      // the thing that is true of both.
      setError('That did not reach us. Check your connection and try again.');
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="vip-done">
        <h2 className="h-section">Application sent</h2>
        <p className="lede" style={{ marginTop: 12 }}>
          It lands in the Discord for review. You will get a reply there
          {discord ? ` as ${discord}` : ' on the handle you gave'} — usually within a few days.
        </p>
        <p className="acct-note" style={{ marginTop: 14 }}>
          Your screenshots went straight to the review channel — none of what you sent is kept on
          this site.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} className="vip-form" onSubmit={submit}>
      <div className="vip-row">
        <label className="field">
          <span>Roobet username</span>
          <input
            name="roobetName"
            defaultValue={roobetName}
            placeholder="yourname"
            required
            minLength={2}
            autoComplete="off"
          />
        </label>

        {discord ? (
          /* Taken from the session rather than asked for. It is the handle the
             reply actually goes to, and one they cannot mistype. */
          <label className="field">
            <span>Discord</span>
            <input value={discord} readOnly aria-readonly className="vip-readonly" />
          </label>
        ) : (
          <label className="field">
            <span>Discord handle</span>
            <input name="discord" placeholder="yourname" required autoComplete="off" />
          </label>
        )}
      </div>

      <div className="vip-row">
        <label className="field">
          <span>What do you mostly play?</span>
          <input name="games" placeholder="Slots, Crash, Blackjack" required autoComplete="off" />
        </label>

        <label className="field">
          <span>Lossback where you play now</span>
          <select name="lossback" defaultValue="" required>
            <option value="" disabled>
              Choose one
            </option>
            {LOSSBACK_OPTIONS.map((o) => (
              <option key={o} value={o}>
                {o === 'N/A' ? 'None / not sure' : o}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Upload
        name="recent"
        label="Proof of your last 30 days"
        hint="Your wagered or lossback figures for the past month, from the casino you play at now."
        picked={recent}
        onPick={pick(setRecent)}
      />

      <Upload
        name="lifetime"
        label="Proof of lifetime wagered"
        hint="The all-time figure on the same account."
        picked={lifetime}
        onPick={pick(setLifetime)}
      />

      <fieldset className="vip-fieldset">
        <legend>Do you want help with KYC?</legend>
        <div className="vip-choices">
          <label className="vip-choice">
            <input type="radio" name="kycHelp" value="yes" />
            <span>Yes</span>
          </label>
          <label className="vip-choice">
            <input type="radio" name="kycHelp" value="no" defaultChecked />
            <span>No</span>
          </label>
        </div>
      </fieldset>

      <label className="field">
        <span>Anything else — optional</span>
        <textarea
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Your current tier, how long you have played there, anything that helps."
        />
      </label>

      {/* The honeypot. Hidden from sight, from screen readers and from tab
          order — a person cannot reach it, a script filling every input will.
          Named so no password manager recognises it, since an autofill here
          would silently drop a real application. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="vip-trap"
      />

      {error && (
        <p className="notice" role="alert">
          <span className="notice-mark" aria-hidden>
            !
          </span>
          {error}
        </p>
      )}

      <button className="btn btn-primary vip-submit" type="submit" disabled={sending}>
        {sending ? 'Sending…' : 'Send Application'}
      </button>

      <p className="acct-note">
        Your screenshots go straight to the review channel in Discord. None of what you send is
        kept here — only a note that you applied, so the form cannot be flooded.
      </p>
    </form>
  );
}

function Upload({
  name,
  label,
  hint,
  picked,
  onPick,
}: {
  name: string;
  label: string;
  hint: string;
  picked: Picked;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="vip-upload">
      <label className="field">
        <span>{label}</span>
        <input
          type="file"
          name={name}
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={onPick}
          required
        />
      </label>
      <p className="vip-hint">{hint}</p>

      {picked.files.length > 0 && (
        <ul className="vip-files">
          {picked.files.map((f) => (
            <li key={f.name + f.size}>
              {f.name} <em>{(f.size / 1024 / 1024).toFixed(1)} MB</em>
            </li>
          ))}
        </ul>
      )}
      {picked.error && <p className="vip-hint vip-warn">{picked.error}</p>}
    </div>
  );
}
