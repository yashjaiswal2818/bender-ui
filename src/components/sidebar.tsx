'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { ChevronDown, LayoutGrid, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { ComponentGroup } from '@/lib/catalog';
import { componentHref } from '@/lib/site';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** One spring for everything that slides along the rail, so the hover light and the current marker move alike. */
const SLIDE = { type: 'spring', stiffness: 520, damping: 40, mass: 0.8 } as const;
/** The current row: the hero's coral running into peach, flat, with a hairline. */
const CURRENT = 'bg-[linear-gradient(100deg,rgba(246,152,138,0.4),rgba(248,220,200,0.14))] ring-1 ring-inset ring-[#f8dcc8]/25';

/** Which component's page this is (null on the index). */
function useCurrent() {
  const path = usePathname();
  const m = path.match(/^\/components\/([^/]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

/** Moves a scroll box just enough to show `el`, with a little air, and only when it isn't already in view. */
function reveal(box: HTMLElement, el: HTMLElement, smooth: boolean) {
  const b = box.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const pad = 40;
  if (r.top >= b.top + pad && r.bottom <= b.bottom - pad) return;
  box.scrollBy({ top: r.top - b.top - (b.height - r.height) / 2, behavior: smooth ? 'smooth' : 'auto' });
}

/* ------------------------------------------------------------------ The rail */

/**
 * The left rail, from `lg`. A filter box on top (press / anywhere), then every component under its category. Two lights
 * move along it as one element each: a soft one that follows the pointer or the keyboard, and the coral marker for the
 * page you're on. Categories fold away; while you filter they all open. Arrow keys walk the list.
 */
export function Sidebar({ groups, total }: { groups: ComponentGroup[]; total: number }) {
  const current = useCurrent();
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [closed, setClosed] = useState<Set<string>>(() => new Set());
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      q
        ? groups
            .map((g) => ({ ...g, items: g.items.filter((i) => `${i.title} ${g.category} ${i.blurb}`.toLowerCase().includes(q)) }))
            .filter((g) => g.items.length)
        : groups,
    [groups, q],
  );
  const count = shown.reduce((n, g) => n + g.items.length, 0);

  // "/" jumps to the filter, from anywhere that isn't already a place to type.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // A long list scrolls inside the rail; bring the page you're on into view.
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (box.current && el) reveal(box.current, el, !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, [current]);

  const rows = () => [input.current, ...(box.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [])].filter((e): e is HTMLElement => !!e);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && query) {
      setQuery('');
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const list = rows();
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (at === -1) return;
    e.preventDefault();
    list[Math.min(list.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)))]?.focus();
  };

  const toggle = (category: string) =>
    setClosed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });

  /** One row: its label, and the lights. */
  const row = (id: string, href: string, on: boolean, inner: ReactNode, indent = false) => (
    <Link
      href={href}
      data-row
      aria-current={on ? 'page' : undefined}
      onPointerEnter={() => setHover(id)}
      onFocus={() => setHover(id)}
      className={`group/row relative flex items-center gap-2 rounded-[10px] py-[7px] pr-2.5 text-[14px] leading-none outline-none transition-colors duration-300 ${
        indent ? 'pl-3.5' : 'pl-2.5'
      } ${on ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink focus-visible:text-ink'}`}
    >
      {hover === id && !on && (
        <motion.span layoutId="rail-hover" transition={SLIDE} aria-hidden className="absolute inset-0 rounded-[10px] bg-ink/[0.06]" />
      )}
      {on && <motion.span layoutId="rail-current" transition={SLIDE} aria-hidden className={`absolute inset-0 rounded-[10px] ${CURRENT}`} />}
      {inner}
    </Link>
  );

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label="Components"
        onPointerLeave={() => setHover(null)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(null);
        }}
        onKeyDown={onKeyDown}
        className="sticky top-[5.5rem] hidden max-h-[calc(100dvh-7rem)] flex-col lg:flex"
      >
        <label className="group/filter relative mb-3 block shrink-0">
          <span className="sr-only">Filter components</span>
          <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3 transition-colors duration-300 group-focus-within/filter:text-ink-2" />
          <input
            ref={input}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter"
            autoComplete="off"
            spellCheck={false}
            className="h-10 w-full rounded-[12px] bg-ink/[0.05] pr-10 pl-9 text-[14px] text-ink ring-1 ring-line outline-none transition-[background-color,box-shadow] duration-300 ring-inset placeholder:text-ink-3 hover:bg-ink/[0.07] focus:bg-ink/[0.07] focus:ring-primary/60"
          />
          <span className="absolute top-1/2 right-2 grid -translate-y-1/2 place-items-center">
            <AnimatePresence initial={false} mode="popLayout">
              {query ? (
                <motion.button
                  key="clear"
                  type="button"
                  aria-label="Clear filter"
                  onClick={() => {
                    setQuery('');
                    input.current?.focus();
                  }}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="grid size-6 place-items-center rounded-md text-ink-3 transition-colors hover:bg-ink/10 hover:text-ink"
                >
                  <X size={14} aria-hidden />
                </motion.button>
              ) : (
                <motion.kbd
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-md px-1.5 py-0.5 font-sans text-[11px] text-ink-3 ring-1 ring-line"
                >
                  /
                </motion.kbd>
              )}
            </AnimatePresence>
          </span>
        </label>

        <div
          ref={box}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [mask-image:linear-gradient(transparent,#000_10px,#000_calc(100%-28px),transparent)] [scrollbar-width:none]"
        >
          {row(
            'all',
            '/components',
            current === null,
            <>
              <span className="grid size-5 place-items-center text-ink-3 transition-colors duration-300 group-hover/row:text-ink">
                <LayoutGrid size={15} strokeWidth={1.75} aria-hidden />
              </span>
              <span className="relative">All components</span>
              <span className="tabular relative ml-auto text-[12.5px] font-normal text-ink-3">{q ? count : total}</span>
            </>,
          )}

          {shown.map(({ category, items }) => {
            const isOpen = q ? true : !closed.has(category);
            return (
              <div key={category} className="mt-4">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => toggle(category)}
                  disabled={!!q}
                  className="group/cat flex w-full items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-left text-[12.5px] font-medium text-ink-3 transition-colors duration-300 hover:text-ink-2 disabled:cursor-default disabled:hover:text-ink-3"
                >
                  <motion.span initial={false} animate={{ rotate: isOpen ? 0 : -90 }} transition={{ duration: 0.35, ease: EASE }} className="grid">
                    <ChevronDown size={13} aria-hidden />
                  </motion.span>
                  {category}
                  <span className="tabular ml-auto font-normal">{items.length}</span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ height: { duration: 0.42, ease: EASE }, opacity: { duration: 0.25 } }}
                      className="overflow-hidden"
                    >
                      {items.map(({ name, title }, i) => (
                        <motion.li
                          key={name}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: 0.05 + i * 0.035, ease: EASE }}
                          className="pt-0.5"
                        >
                          {row(
                            name,
                            componentHref(name),
                            current === name,
                            <span className="relative transition-transform duration-300 ease-[var(--ease-out)] group-hover/row:translate-x-0.5">{title}</span>,
                            true,
                          )}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {shown.length === 0 && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} className="px-2.5 pt-3 text-[13.5px] leading-relaxed text-ink-3">
              Nothing called “{query.trim()}”.{' '}
              <button type="button" onClick={() => setQuery('')} className="text-ink-2 underline decoration-line-2 underline-offset-4 transition-colors hover:text-ink">
                Clear
              </button>
            </motion.p>
          )}
        </div>
      </nav>
    </MotionConfig>
  );
}

/* ---------------------------------------------------------------- The phone bar */

/**
 * Below `lg` the rail becomes one row of pills that sticks under the header. The marker slides to the page you're on,
 * and the row scrolls so that pill is in the middle.
 */
export function SidebarBar({ groups, total }: { groups: ComponentGroup[]; total: number }) {
  const current = useCurrent();
  const row = useRef<HTMLUListElement>(null);
  const items = groups.flatMap((g) => g.items);

  useEffect(() => {
    const r = row.current;
    const on = r?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!r || !on) return;
    const a = r.getBoundingClientRect();
    const b = on.getBoundingClientRect();
    r.scrollTo({ left: r.scrollLeft + b.left - a.left - (a.width - b.width) / 2, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [current]);

  const pill = (href: string, on: boolean, label: ReactNode) => (
    <li key={href} className="shrink-0">
      <Link
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`relative flex items-center gap-2 rounded-full px-3.5 py-[7px] text-[13.5px] leading-none whitespace-nowrap transition-colors duration-300 ${on ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}
      >
        {on && <motion.span layoutId="bar-current" transition={SLIDE} aria-hidden className={`absolute inset-0 rounded-full ${CURRENT}`} />}
        <span className="relative">{label}</span>
      </Link>
    </li>
  );

  return (
    <MotionConfig reducedMotion="user">
      <nav aria-label="Components" className="sticky top-16 z-30 -mx-4 border-b border-line bg-bg/85 backdrop-blur-md sm:-mx-6 lg:hidden">
        <ul
          ref={row}
          className="flex gap-1 overflow-x-auto px-4 py-2.5 [mask-image:linear-gradient(90deg,transparent,#000_24px,#000_calc(100%-24px),transparent)] [scrollbar-width:none] sm:px-6"
        >
          {pill(
            '/components',
            current === null,
            <>
              All <span className="tabular ml-1.5 text-[12px] font-normal text-ink-3">{total}</span>
            </>,
          )}
          {items.map(({ name, title }) => pill(componentHref(name), current === name, title))}
        </ul>
      </nav>
    </MotionConfig>
  );
}
