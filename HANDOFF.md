# Handoff

Everything a new session needs that is not obvious from reading the code.
Pair it with [DESIGN.md](DESIGN.md) for the visual decisions and
[README.md](README.md) for running it.

## What this is

A community site for **Fugroo**, a Kick streamer partnered with **Roobet**.
Players sign up under code `Fugroo`, and the site shows the monthly wager
leaderboard, rank rewards, bonus hunts, guess-the-balance rounds and chat
giveaways. Next 15 / React 19 / TypeScript, no CSS framework — four
hand-written stylesheets under `src/app`.

Deployment target is a **VPS** the owner is buying. Not Vercel.

## Getting it running

```bash
npm install
cp .env.example .env    # fill in — see below
npm run dev
```

It runs with an empty `.env`. The board shows every seat open, the login button
sits disabled and says why, and nothing crashes. That is deliberate: no secret
should be required to work on the design.

`.env` is gitignored and has never been committed. **Do not commit it**, and do
not echo its values into a transcript.

## Five things that will cost you an hour if you do not know them

**1. `AUTH_URL` must be pinned, always.**
Next builds `request.url` from its own binding — it honours
`x-forwarded-proto` but ignores `x-forwarded-host`. Behind any proxy (nginx, a
tunnel) it reports `https://localhost:<port>` even though the right host header
arrived. Auth.js builds the OAuth callback from that, so an unpinned `AUTH_URL`
sends people to localhost on their own machine. `trustHost: true` does **not**
cover this. Whatever `AUTH_URL` is set to must also be registered on the
Discord app as `<AUTH_URL>/api/auth/callback/discord`, exact match.

**2. The JSON store is single-process.**
`src/lib/store.ts` writes `data/*.json` atomically (temp file, then rename) with
writes serialised per file. It is deliberately not a database — one Next
process, tens of rows. Everything goes through that module, so swapping to
Postgres is a rewrite of one file. **It cannot run behind more than one
process.** If the site is ever load-balanced, this changes first.

**3. The giveaway and the Kick socket live in memory.**
`src/lib/giveaway.ts` holds the current round; `src/lib/kick.ts` holds the
websocket. Both die on redeploy. That was a decision, not an oversight — a
giveaway happens during one stream, and the honest answer to a half-finished
round after a restart is "run it again". A separate worker process is the
upgrade path if that stops being acceptable.

**4. Reading Kick chat needs no credentials.**
The feed is public Pusher: subscribe to `chatrooms.<id>.v2` with only the
chatroom id, which `https://kick.com/api/v2/channels/<slug>` hands over.
Fugroo is channel `6434`, chatroom `6433`. None of Kick's OAuth setup is
needed for the roller — that is for *acting as* an account, and we only listen.

**5. Every page is dynamic.**
The root layout reads the session so the top bar knows who you are, which opts
every route out of static rendering. The Roobet fetch keeps its own 60s cache,
so rate-limit protection is unaffected. Do not "fix" this without replacing the
personalised shell.

## Data

Two different Roobet lookups, and they answer different questions:

| Module | Window | Question |
|---|---|---|
| `lib/providers/roobet.ts` | current month | who is winning |
| `lib/roster.ts` | all time (`ROOBET_STATS_SINCE`) | is this person one of ours |

The endpoint **only returns players who have wagered**. Someone who signed up
ten minutes ago and has not bet does not appear, and is correctly told they are
not under the code — which is why the copy says to place a bet rather than to
check their spelling.

Usernames are masked in `lib/providers/shared.ts`, not per provider, so a new
integration cannot forget to. Staff in `lib/staff.ts` are dropped before
ranking *and* before the totals.

## Admin

`src/lib/admin.ts`. Matched on the Discord handle `aspectdzns_` today, but
`ADMIN_DISCORD_IDS` (comma-separated, from env) is checked first and wins.

**Move to the id as soon as the account has logged in once.** A handle can be
changed, and a released one can be claimed by someone else who would inherit
the panel. The id cannot.

Gating is three layers and only the last counts: the nav entry hides, `/admin`
redirects, and **every server action re-checks the session before touching
anything** — a form post does not care what the browser was showing.

## What is live and what is not

| Section | State |
|---|---|
| Home, leaderboard, bonuses, milestones | Live |
| Bonus hunts | Live — admin creates, records payouts; public board |
| Guess the balance | Live — rounds, guesses, draw |
| Giveaways | Live — Kick chat + site entry, Roobet code gate, roll |
| Profile / Roobet linking | Live |
| **Tournaments** | **Placeholder only** — holding page, "Soon" badge |
| Google sign-in | Scaffolded, not wired. Add credentials and the button appears on its own. |

Card artwork is inline SVG in `src/components/CardArt.tsx` — no raster
dependencies. Each card animates the thing it is about (the arrow strikes the
target, the lid lifts). Gem placement is one shared constant so the set reads
as a set.

## Open items

- **Move admin to `ADMIN_DISCORD_IDS`** once the owner has logged in.
- **Tournaments** section — the only placeholder left.
- **Google OAuth** — client id and secret; redirect
  `<AUTH_URL>/api/auth/callback/google`. Consent screen must be filled in
  first; External is fine, no verification needed for name and email.
- **VPS deploy** — standalone build, systemd unit, nginx with the proxy
  headers, certbot, and `AUTH_URL` set to the real domain. Not written yet.
- **Prize table** — `$1,000` over ten places, from `ROOBET_PRIZES` in
  `lib/partners.ts`. The headline is summed from that array, never typed
  separately. Came from fugroobets.com's own bundle, where the dates read
  `2025-05` — worth confirming it is current.
- **Account linking is a claim, not proof.** Roobet gives no way to verify a
  person owns a username; all we check is that the name is in our affiliate
  list. A name is unique across profiles, which is what stops someone entering
  under another player's play. If that turns out not to be enough, the fix is
  Roobet's side, not ours.

## Conventions worth keeping

- Copy lives in `lib/partners.ts` and reads the code and partner name from the
  registry, so nothing can drift from the prize table.
- A section that is not ready renders a holding page that says so, rather than
  a nav entry leading nowhere.
- Placeholder mechanics are marked with a `pending` note in the UI rather than
  invented.
- The board never fabricates standings. With no credentials or a failed fetch,
  every paying seat renders unclaimed with its prize attached and a notice
  above it.
