# Fugroo

Monthly Roobet wager leaderboard for the Fugroo community.

Next.js 15 (App Router) · React 19 · TypeScript. No CSS framework — the design
system is three hand-written stylesheets under `src/app`.

## Running it

```bash
npm install
cp .env.example .env    # optional; the site builds and runs without it
npm run dev
```

## Environment

| Variable | What it is |
|---|---|
| `ROOBET_API_KEY` | Bearer token from the Roobet affiliate account. Server-only. |
| `ROOBET_USER_ID` | Affiliate user id, issued with the key. |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin. Optional on Vercel. |

Without the two Roobet values the board renders every paying seat as unclaimed
with its prize attached, plus a "temporarily unavailable" notice. That is the
designed empty state — it never invents standings, because a hardcoded row
renders as a real player with a real-looking figure.

## Layout

```
src/
  app/
    globals.css        design tokens, shell, buttons, footer
    home.css           hero, card rack, leaderboard promo
    leaderboard.css    board page, countdown, standings
    layout.tsx         fonts, metadata, structured data
    <route>/page.tsx
  components/          Hero, Rack, Promo, Board, Shell, …
  lib/
    partners.ts        prize table, code, links — edit here, nowhere else
    sections.ts        the six card-rack destinations and their hues
    providers/roobet   the only place that talks to Roobet
    services/          the only entry point components use for a board
```

Components never import a provider. They ask `services/leaderboard`, which
means which casino is behind the numbers stays an implementation detail and a
second partner is one file.

## Data

`providers/roobet.ts` calls `roobetconnect.com/affiliate/v2/stats` for the
current calendar month and ranks on **weighted** wagered — Roobet weights by
house edge, and the published rules rank on that figure, so showing the raw
one would invite the question of which pays.

Usernames are masked in `providers/shared.ts`, not per provider, so a new
integration cannot forget to. Staff accounts in `lib/staff.ts` are dropped
before ranking *and* before the totals.

Responses are cached 60s. Do not lower it — one upstream call a minute is what
keeps any amount of traffic under the rate limit.

## Design

See [DESIGN.md](DESIGN.md) for the palette, the type system, why the hero is
built the way it is, and what was deliberately left out.

## Preview

`./run.sh` rebuilds, restarts the preview server and writes screenshots to the
scratchpad. It waits for the port to free first: `next start` caches the build
manifest at boot, so a server still holding the port after a rebuild serves
HTML pointing at asset hashes that no longer exist and every page renders
unstyled.
