# FUGROO — design notes

Where the decisions came from, so the next pass does not re-litigate them.

## Where the look is from

Three sources, in order of authority:

1. **The logo.** Cyan wordmark, hexagonal shield, navy and black. It is the
   brand, so it wins every argument.
2. **fugroobets.com's own CSS**, pulled from their live bundle: `#04022E`,
   `#090B2A`, `#080633` grounds; `#01CCFF`, `#00C3FF`, `#00F0FF`, `#69DFFF`
   cyans; `#9A36F8` violet. Montserrat, Outfit, Oxanium, Lato.
3. **The commissioned artwork** — vault plate, hex frame, desk rail, ace,
   dice, chip. All lit cyan-on-navy with violet secondaries, which confirms
   the same palette from a third direction.

Everything here follows those. Nothing was invented for the sake of it.

## Palette

| Token | Hex | Role |
|---|---|---|
| `--void` | `#05071A` | page ground |
| `--hull` | `#0B1030` | cards, sidebar, footer |
| `--hull-2` | `#131A45` | raised state, active nav |
| `--edge` | `#1E2A63` | every divider and outline |
| `--edge-lit` | `#2F3F8C` | hover borders |
| `--text` | `#EAF2FF` | primary |
| `--muted` | `#9AABD6` | secondary |
| `--dim` | `#7B8CBA` | labels, disabled |
| `--cyan` | `#22D3FF` | the accent, and the only signal colour |
| `--violet` | `#7B3FFF` | second light, third place, VIP |

All three text tokens clear 4.5:1 on `--void` and on `--hull`.

**Rank accents** are `--cyan` / `#9FB2D9` steel / `--violet`. Deliberately not
gold-silver-bronze: those belong to every other site in this category, and
steel sits between the two brand lights so the podium reads as one family.

**Card hues** are five — cyan, violet, blue, teal, amber — one per destination
on the rack. The hue is the card's identity, which is how someone finds
Raffles again without reading. Five is a system; gumbo.gg's eight is a swatch
book.

## Type

Two families, each with a reason.

- **Oxanium** (600/700/800) — angular and hexagonal, so it carries the hex
  motif of the artwork into the type. It also sets **every figure on the
  site**: its tabular numerals are why there is no third family for numbers,
  which is the usual mistake here.
- **Outfit** (400–700) — geometric, quiet, and handles everything a person
  actually reads.

Both were already on fugroobets.com, so this is their type system, tightened.

## The three set pieces

### 1. Hero — the vault

The scene and nothing else. It owns the whole first screen and runs to the
divider — no strapline, no button band. Four depth planes: the room drifting,
the mascot under his wordmark, the two aces turning past him on either side,
and the rail cropping him at the chest and closing the frame.

Two grid rows — stage `1fr`, rail `auto` — so the scene grows into a tall
screen and holds its shape on a short one without a height media query
anywhere.

Nothing is written over it and nothing is stacked under it. The places to act
are the sidebar, the rack immediately below, and the leaderboard itself.

The wordmark sits **above** him, overlapping the crown of his cap. It spent one
pass across his chest, which buried the cards in his hand — the one detail that
says what the site is about.

- The vault plate is **baked** darker and softer at build time
  (`brightness 0.46, saturation 0.7, blur 2.4`) rather than filtered in CSS.
  A full-screen CSS filter is expensive, and the plate is a backdrop, not the
  subject.
- The rail is **cropped to its lit edge only**. The tall dark body this kind
  of asset ships with is a CSS gradient on the deck instead, which is what
  makes the copy below it land on flat ground rather than on a glowing bar.
  Getting this wrong was the first version's worst defect.
- **The hex frame was cut.** The vault plate already has a large hexagon at
  its centre and the mascot carries his own badge; a third hexagon at the same
  focal point read as mud, not as depth. `frame.png` is still in the repo if a
  use turns up that is not this one.
- One orchestrated load sequence — wordmark, mascot, rail, in that order — and
  then nothing but ambient drift. **There are no scroll reveals anywhere on
  the site.** A dozen fade-ups read as a template; one staged moment reads as
  a decision.

### 2. The card rack

Six cards, three across, two deep. Six in a four-wide grid leaves a ragged row
of two and the eye reads that as something missing.

Each card carries one hue, driving the label bar, the bloom behind the art and
the lit border. The **media slot is deliberately dumb**: it renders the still,
and if the card supplies a `motion` URL it layers that above and crossfades on
hover. Swapping a looping video for a Rive canvas or an animated SVG is a
change inside `RackCard` and nowhere else.

Hover is decoration only. The label states the destination and the whole card
is a link, so nothing is reachable only by hovering, and `@media (hover: none)`
means a touch device never fetches a motion file at all.

### 3. The leaderboard promo

**Drawn entirely in CSS** — the plate, both blooms, the hex wash, the rank
plates and their haze. No banner image anywhere in it. That is what keeps the
prize figure and the three names live text: the section updates itself when
the standings move, it stays legible at any width, and a screen reader can
read it.

Structurally it is the SpinVerse podium — rank pill, card, prize bar tucked
*behind* the card's lower edge — with its four per-column image dependencies
(`glow-*.png`, `ring-*.svg`, `avatar-*.png`, `mask-trophy.png`) replaced by a
radial gradient, a bordered circle, a masked mark and an inline SVG.

**Proportions come from the Figma frame** (`GrZ4Aiq9pjTUiHEvaQZJc5`), read out
of the spinverse repo's CSS comments, which record the canvas coordinates. They
are stored as ratios of the card's own width rather than as the absolute pixels
the source file uses:

| Element | Figma | Ratio |
|---|---|---|
| card height | 238.047 | 105cqi |
| avatar | 117.046 | 51.5cqi |
| badge | 99.071 × 19.264 | 44 × 8.5cqi |
| name | 27.709 | 12.2cqi |
| metric label | 13.651 | 6cqi |
| amount | 24.511 | 10.8cqi |
| prize bar | 193 | 85% |

`cqi` is a percentage of one card's own width, which is what lets the same
component be the ~200px card in the home promo and the ~260px card on the
leaderboard with no second ruleset and no breakpoint. The source file is a
fixed 1920px canvas; this is the same design that survives a resize.

**Second and third sit level.** Figma staggers them by 5.5px (24.77 vs 30.27),
which reads as a mistake rather than a decision — a podium has two steps, not
three. First place is raised and the other two are equal, so the three prize
bars land on one line.

Where Roobet returns a `rankLevelImage` it fills the avatar socket; where it
does not, the operator mark stands in, masked to the rank colour.

The podium and the table are fed from the same board, so they cannot disagree.

## Shapes carry meaning

One radius everywhere is the commonest tell of a generated page, so each
element type has its own:

- **Rack cards** — 16px rounded. They are soft entry points.
- **Podium plates** — clip-path with cut top-left and bottom-right corners,
  echoing the hex frame. They are trophies.
- **Countdown cells** — true hexagons, cut with `clip-path`, not loaded as an
  SVG per cell.
- **Table rows** — 10px, alternating fills and no rules at all. At ten rows a
  striped table is read across more reliably than a ruled one.

## Deliberately absent

- Gold, silver and bronze.
- Scroll-triggered reveals on every section.
- All-caps eyebrow labels above headings. The only caps on the site are the
  rack label chips and the podium's `WAGERED`, both of which are the
  category's own vernacular rather than decoration.
- A monospace family for data labels.
- `01 / 02 / 03` markers anywhere except *How it works*, which really is a
  sequence.

## Open items

- **Card artwork** — the six stills are wireframe placeholders. Prompts for
  the real set are in the conversation; drop them at `public/card-*.png`.
- **Motion** — cards animate in CSS today (ambient bob, hover lift, bloom
  spread). Add a `motion` URL to a `SECTION_CARDS` entry to layer a video or
  Rive file over the still.
- **Roobet credentials** — live and verified against
  `roobetconnect.com/affiliate/v2/stats`. The feed returns an empty array for
  the current month, so every seat renders unclaimed with its prize attached.
  That is the designed empty state, not a failure — the board never invents
  standings.
- **Login** (email + Discord OAuth), raffles, tournaments, guess-the-balance
  and bonus-hunts content — designed, not built. Each has a route and a
  holding page that borrows its card's hue and art.
- **Prize table** — `$1,000` over ten places
  (`450 / 225 / 100 / 65 / 50 / 40 / 30 / 20 / 10 / 10`), set in
  `ROOBET_PRIZES`. The headline pool is **summed from that array**, never typed
  out separately, so the figure on every page and the table can never disagree.
