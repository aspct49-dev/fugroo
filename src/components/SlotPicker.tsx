'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { loadSlots, searchSlots, type Slot } from '@/lib/slots';

/**
 * Picking a slot, with the artwork.
 *
 * A combobox rather than a `<select>`, for the reason a select cannot solve:
 * there are 3,746 games. Typing filters, and — this is the part that matters —
 * anything typed that is not in the catalogue is still accepted. A tournament
 * runs live on stream; a field that refuses a real game because the catalogue
 * is a week out of date is worse than no catalogue at all.
 *
 * It replaced a native `<datalist>`, which does all of the above for free but
 * cannot show an image. The artwork is the point: an admin scanning for
 * *Gates of Olympus* recognises the picture a good deal faster than the words,
 * and the same is true of the viewer reading the finished bracket.
 *
 * The list is rendered into a portal. The bracket scrolls sideways inside
 * `overflow-x: auto`, which forces the other axis to clip, so a dropdown
 * positioned inside that box would be cut off at the card's edge. Fixed
 * position against the viewport is what lets it escape.
 */

export interface SlotPickerProps {
  /** Controlled text. Omit to let the field manage its own. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Fires with the catalogue entry when one is chosen, null for free text. */
  onPick?: (slot: Slot | null) => void;
  /** Set to post the value in a plain form. */
  name?: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  /** The compact treatment used inside a bracket card. */
  compact?: boolean;
}

const MAX_RESULTS = 40;

export function SlotPicker({
  value,
  defaultValue = '',
  onChange,
  onPick,
  name,
  placeholder = 'Slot',
  ariaLabel = 'Slot',
  className,
  compact = false,
}: SlotPickerProps) {
  const [inner, setInner] = useState(defaultValue);
  const text = value !== undefined ? value : inner;

  const [catalogue, setCatalogue] = useState<Slot[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [box, setBox] = useState<{ top: number; left: number; width: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  const wrapRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => setMounted(true), []);

  const setText = useCallback(
    (next: string) => {
      if (value === undefined) setInner(next);
      onChange?.(next);
    },
    [value, onChange],
  );

  // The catalogue is only worth fetching once someone actually opens a picker.
  const ensureCatalogue = useCallback(() => {
    if (catalogue.length) return;
    void loadSlots().then(setCatalogue);
  }, [catalogue.length]);

  const results = open ? searchSlots(catalogue, text, MAX_RESULTS) : [];

  /* ------------------------------------------------------------ position */

  const place = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    place();
    // `true` catches scrolling of the bracket's own container, not just the
    // page — otherwise the list detaches from its field as the bracket moves.
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open, place]);

  // Close when focus or a click goes somewhere else entirely.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  /* --------------------------------------------------------------- keys */

  const choose = (slot: Slot) => {
    setText(slot.name);
    onPick?.(slot);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        ensureCatalogue();
        return;
      }
      if (!results.length) return;
      setActive((i) => {
        const next = e.key === 'ArrowDown' ? i + 1 : i - 1;
        return (next + results.length) % results.length;
      });
      return;
    }
    if (e.key === 'Enter' && open && results[active]) {
      // Only swallow Enter when a suggestion is actually highlighted, so the
      // key still submits the form it sits in when the list is closed.
      e.preventDefault();
      choose(results[active]);
      return;
    }
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
    }
  };

  // Keep the highlighted row in view when arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLLIElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  /* ------------------------------------------------------------- render */

  const list =
    open && box && mounted
      ? createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            className="slotp-list"
            style={{ top: box.top, left: box.left, width: box.width }}
          >
            {results.length === 0 ? (
              <li className="slotp-empty" role="presentation">
                {catalogue.length === 0
                  ? 'Loading the catalogue…'
                  : `No match — “${text}” will be saved as typed`}
              </li>
            ) : (
              results.map((slot, i) => (
                <li
                  key={`${slot.provider}:${slot.name}`}
                  id={`${listId}-${i}`}
                  data-index={i}
                  role="option"
                  aria-selected={i === active}
                  className="slotp-opt"
                  data-active={i === active}
                  // mousedown, not click: click fires after blur, by which
                  // point the list has already closed underneath the pointer.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(slot);
                  }}
                  onMouseEnter={() => setActive(i)}
                >
                  <SlotArt slot={slot} />
                  <span className="slotp-opt-text">
                    <b>{slot.name}</b>
                    <span>{slot.provider}</span>
                  </span>
                </li>
              ))
            )}
          </ul>,
          document.body,
        )
      : null;

  return (
    <span className="slotp" ref={wrapRef} data-compact={compact || undefined}>
      <input
        ref={inputRef}
        name={name}
        className={className ?? (compact ? 'bkt-slot-in' : 'slotp-in')}
        value={text}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        onFocus={() => {
          ensureCatalogue();
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
          ensureCatalogue();
          // Typing over a chosen game makes it free text again until something
          // is picked, so the stored artwork cannot belong to a different slot.
          onPick?.(null);
        }}
        onKeyDown={onKeyDown}
      />
      {list}
    </span>
  );
}

/**
 * One thumbnail.
 *
 * A plain `<img>`, not `next/image`: the catalogue points at four different
 * Roobet CDN hosts and these are 40px thumbnails behind an admin login, so
 * routing thousands of them through the optimiser would buy nothing and cost
 * a remotePatterns entry per host. A failed load falls back to the initial
 * rather than leaving a broken-image glyph in the list.
 */
function SlotArt({ slot }: { slot: Slot }) {
  const [failed, setFailed] = useState(false);

  if (!slot.img || failed) {
    return <span className="slotp-art slotp-art-fallback">{slot.name.charAt(0)}</span>;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN thumbnail
    <img
      className="slotp-art"
      src={slot.img}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

/** The same artwork, for showing a slot that has already been chosen. */
export function SlotThumb({ name, img }: { name: string; img?: string }) {
  const [failed, setFailed] = useState(false);

  if (!img || failed) {
    return (
      <span className="slotp-art slotp-art-fallback" aria-hidden>
        {name.charAt(0) || '—'}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- external CDN thumbnail
    <img
      className="slotp-art"
      src={img}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
