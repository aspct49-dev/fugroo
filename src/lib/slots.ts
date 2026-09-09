/**
 * The Roobet slot catalogue.
 *
 * 3,746 titles across 24 providers, each with the artwork Roobet serves for
 * it, in `public/slots.json`. It is a static file rather than a fetch because
 * Roobet's affiliate API is a stats endpoint — it reports what a player
 * wagered and their `favoriteGameTitle`, and publishes no game catalogue.
 *
 * It is 600KB, which is the whole reason it is a file in `public/` and not an
 * import. Importing it would put every one of those titles into the JavaScript
 * bundle of every page that touches a slot field; fetching it means the file
 * is downloaded once, by the one person who opened a picker, and then cached
 * by the browser like any other asset.
 *
 * When a slot is chosen its name, provider and image are copied onto whatever
 * picked it — a bracket match, a bonus hunt row. That denormalisation is
 * deliberate: it means a finished tournament still renders its artwork without
 * loading the catalogue, and a bracket played last month keeps the art it was
 * played with even if the catalogue is refreshed underneath it.
 *
 * TO REFRESH: regenerate `public/slots.json`, shape
 *   [{ "name": "...", "provider": "...", "img": "..." }]
 * `img` is optional; the picker falls back to an initial when it is missing.
 */

export interface Slot {
  name: string;
  provider: string;
  img?: string;
}

export const SLOT_CATALOGUE_URL = '/slots.json';

/**
 * Case- and punctuation-insensitive key for a title.
 *
 * Curly and straight apostrophes are the same character to a person typing and
 * different characters to a computer, and a good part of the catalogue has
 * one. Folding them is why "gonzos quest" finds "Gonzo's Quest", and why
 * "book of" finds "Book of Dead".
 */
export function slotKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Keys are computed once per catalogue, not once per keystroke.
 *
 * `slotKey` runs three regexes, and a naive search runs it 3,746 times for
 * every character typed. Cached against the array itself, so a re-fetched
 * catalogue gets fresh keys and a garbage-collected one takes its keys with it.
 */
const keyCache = new WeakMap<Slot[], { name: string; provider: string }[]>();

function keysFor(catalogue: Slot[]): { name: string; provider: string }[] {
  let keys = keyCache.get(catalogue);
  if (!keys) {
    keys = catalogue.map((s) => ({ name: slotKey(s.name), provider: slotKey(s.provider) }));
    keyCache.set(catalogue, keys);
  }
  return keys;
}

/**
 * Matches for a query, best first.
 *
 * Three tiers, because with 3,746 titles the ranking is what makes the list
 * usable at all: an exact match, then titles starting with the query, then
 * titles containing it. The provider is searched in the last tier too, so
 * typing "nolimit" lists that studio — which is how people who know the
 * catalogue actually look for something.
 *
 * Within a tier, shorter titles first. The catalogue carries no popularity
 * signal of any kind, so there is nothing to rank by that would put the
 * best-known game on top; what length does reliably capture is that a base
 * game sorts above its own variants — *Sweet Bonanza* before *Sweet Bonanza
 * Super Scatter*, *Razor Shark* before *Razor Shark Jackpots*. Ties break
 * alphabetically so the order is stable rather than dependent on file order.
 *
 * The whole catalogue is scanned. An earlier version stopped once it had
 * enough rows, which quietly made the results depend on the order of the file:
 * "gates" returned four studios nobody asked for and buried *Gates of Olympus*
 * behind them, purely because Pragmatic Play sorts late in the alphabet.
 */
export function searchSlots(catalogue: Slot[], query: string, limit = 40): Slot[] {
  const q = slotKey(query);
  if (!q) return catalogue.slice(0, limit);

  const keys = keysFor(catalogue);
  const exact: Slot[] = [];
  const starts: Slot[] = [];
  const contains: Slot[] = [];

  for (let i = 0; i < catalogue.length; i++) {
    const name = keys[i].name;
    if (name === q) exact.push(catalogue[i]);
    else if (name.startsWith(q)) starts.push(catalogue[i]);
    else if (name.includes(q) || keys[i].provider.includes(q)) contains.push(catalogue[i]);
  }

  const byLength = (a: Slot, b: Slot) =>
    a.name.length - b.name.length || a.name.localeCompare(b.name);

  starts.sort(byLength);
  contains.sort(byLength);

  return [...exact, ...starts, ...contains].slice(0, limit);
}

/** The catalogue entry for a title, or undefined when it is free text. */
export function findSlot(catalogue: Slot[], name: string): Slot | undefined {
  const k = slotKey(name);
  return catalogue.find((s) => slotKey(s.name) === k);
}

/**
 * Loads the catalogue, once per page.
 *
 * Browser only — it fetches a relative URL. The promise itself is cached
 * rather than the result, so two pickers mounting together share one request
 * instead of racing to make two.
 */
let pending: Promise<Slot[]> | null = null;

export function loadSlots(): Promise<Slot[]> {
  if (!pending) {
    pending = fetch(SLOT_CATALOGUE_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`slots.json responded ${res.status}`);
        return res.json() as Promise<Slot[]>;
      })
      .then((rows) => (Array.isArray(rows) ? rows : []))
      .catch(() => {
        // A failed catalogue must not break the field it decorates: the picker
        // falls back to plain typing, which is all it ever was underneath.
        pending = null;
        return [];
      });
  }
  return pending;
}
