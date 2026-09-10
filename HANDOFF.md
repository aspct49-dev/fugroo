# Handoff

Everything a new session needs that is not obvious from reading the code.
Pair it with [DESIGN.md](DESIGN.md) for the visual decisions and
[README.md](README.md) for running it.

## What this is

A community site for **Fugroo**, a Kick streamer partnered with **Roobet**.
Players sign up under code `Fugroo`, and the site shows the monthly wager
leaderboard, rank rewards, tournament brackets, guess-the-balance rounds and
chat giveaways. Next 15 / React 19 / TypeScript, no CSS framework — four
hand-written stylesheets under `src/app`.

Deployment target is a **VPS**. There is an interim Vercel deploy for the
owner to demo to the client — see "Deploying" below for what does and does not
survive that.

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

**2. The JSON store has two backends, and neither is a database.**
`src/lib/store.ts` is the only thing that reads or writes state — tournaments,
guesses and profiles all go through it. It picks its backend from the
environment:

- **Files** by default: `data/*.json`, written atomically (temp file, then
  rename), writes serialised per file. This is what a single Next process on a
  VPS wants.
- **KV** when `KV_REST_API_URL` or `UPSTASH_REDIS_REST_URL` is set. Serverless
  platforms have no writable disk outside `/tmp`, and `/tmp` is per-instance
  and wiped — so on Vercel the file backend does not degrade, it *fails*: every
  write throws and every read comes back empty. See "Deploying" below.

Neither backend does compare-and-set, so **two processes writing the same table
at the same moment can still lose an edit**. Writes are serialised within one
process and that is all. For one admin running an event this is fine; if that
stops being true, the fix is a real database, not a lock bolted onto this.

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
| **Tournaments** | Live — admin builds a bracket, publishes it, decides each match on the higher multiple; public page is read-only |
| Guess the balance | Live — rounds, guesses, draw. Took over the bonus-hunt card |
| Raffles | Section exists, not open yet |
| Giveaway roller | Live on a VPS only — Kick chat + site entry, Roobet code gate, spin. See "Deploying" |
| Profile / Roobet linking | Live |
| ~~Bonus hunts~~ | **Retired.** `/bonus-hunts` redirects to `/guess-the-balance`. `lib/hunts.ts` and `HuntBoard.tsx` were deleted — recover from git if it comes back |
| Google sign-in | Scaffolded, not wired. Add credentials and the button appears on its own. |

Card artwork is inline SVG in `src/components/CardArt.tsx` — no raster
dependencies. Each card animates the thing it is about (the arrow strikes the
target, the lid lifts). Gem placement is one shared constant so the set reads
as a set.

## Deploying

**VPS — the real target.** One `next start` process. Everything works: the file
store persists, the Kick socket stays connected, and the giveaway's in-memory
state lives as long as the process does. Still to write: standalone build,
systemd unit, nginx with the proxy headers, certbot, and `AUTH_URL` set to the
real domain.

**Vercel — the interim demo.** Most of the site works there, and two things do
not:

| | On Vercel |
|---|---|
| Home, leaderboard, bonuses, milestones, sign-in | Work — read-only against the Roobet API |
| Tournaments, guess the balance, Roobet linking | Work **only with a KV store connected**. Without one, every write throws |
| **Kick giveaway** | **Does not work.** `lib/kick.ts` holds a long-lived WebSocket and `lib/giveaway.ts` holds entries in module memory. Serverless functions do not persist between invocations, so the socket dies and entries collected by one instance are invisible to the next. No amount of storage fixes this — it needs a process that stays running |

To deploy the demo: connect a KV store to the project (Vercel KV or Upstash —
either sets the env vars `store.ts` looks for), set the rest of the environment
from `.env.example`, and **set `AUTH_URL` to the Vercel domain** and register
`<AUTH_URL>/api/auth/callback/discord` on the Discord app. Item 1 above is not
optional there either.

## Open items

- **Move admin to `ADMIN_DISCORD_IDS`** once the owner has logged in.
- **Google OAuth** — client id and secret; redirect
  `<AUTH_URL>/api/auth/callback/google`. Consent screen must be filled in
  first; External is fine, no verification needed for name and email.
- **VPS deploy** — standalone build, systemd unit, nginx with the proxy
  headers, certbot, and `AUTH_URL` set to the real domain. Not written yet.
- **The giveaway roller needs a process that stays running.** It works on a
  VPS and cannot work on Vercel. If the interim demo has to show it, that
  means a small always-on worker holding the socket, not a storage change.
- **`public/slots.json`** — Roobet's catalogue, 3,746 games with artwork,
  refreshed by hand. The picker accepts anything typed, so a stale catalogue
  costs typing rather than correctness.
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
