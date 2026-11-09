'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { TuckMenu, useTuckMenu } from '@registry/components/tuck-menu/tuck-menu';
import { SITE } from '@/lib/site';
import { ComponentsMarquee, type MarqueeItem } from './components-marquee';
import { GithubMark } from './github-mark';
import { HomeHero } from './home-hero';
import { HomeScrollProvider, useHomeScroll } from './home-scroll';
import { Logo } from './logo';
import { WhatWeDo } from './what-we-do';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Aspect ratio of public/hero-bg.webp. Generate yours at 16:9 and nothing here needs to change. */
const BG_ASPECT = 16 / 9;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** The navbar row sits at the same height as the menu's own button, so the two read as one bar. */
const BAR_TOP = 'top-[clamp(14px,3.2cqh,22px)]';
/** How the capsules follow the scroll: soft, so they glide rather than snap. */
const FOLLOW = { stiffness: 220, damping: 30, mass: 0.7 };

/** The round buttons (GitHub, and the menu's own button), before and after the page has scrolled. */
const CONTROL_REST = 'bg-white/15 ring-white/25 backdrop-blur-md hover:bg-white/25';
const CONTROL_SCROLLED = 'bg-[#150c2c]/45 ring-white/15 backdrop-blur-xl shadow-[0_12px_36px_-14px_rgba(10,4,30,0.8)] hover:bg-[#150c2c]/65';
/** The same, for the Tuck Menu's button. Only while it is closed, so the paper-white "Close" state is left alone. */
const TOGGLE_SCROLLED =
  'aria-[expanded=false]:bg-[#150c2c]/45 aria-[expanded=false]:ring-white/15 aria-[expanded=false]:backdrop-blur-xl aria-[expanded=false]:shadow-[0_12px_36px_-14px_rgba(10,4,30,0.8)] aria-[expanded=false]:hover:bg-[#150c2c]/65';

interface Page {
  label: string;
  href: string;
  meta?: string;
  /** Shown big inside the tucked card while the menu points at this link. */
  title: string;
  caption: string;
  /** Where the camera looks on the background, in % of the frame, and how close. */
  focus: { x: number; y: number; zoom: number };
}

const pages = (count: number): Page[] => [
  {
    label: 'Home',
    href: '/',
    title: 'Components worth touching.',
    caption: 'Open-source React components you can try live, then take with one command.',
    focus: { x: 50, y: 58, zoom: 1 },
  },
  {
    label: 'Components',
    href: '/components',
    meta: String(count),
    title: 'Every component, live.',
    caption: 'Open one to try it, then take its code, its props or a prompt for your AI.',
    focus: { x: 20, y: 60, zoom: 1.55 },
  },
  {
    label: 'Docs',
    href: '/docs',
    title: 'One command to add it.',
    caption: 'Paste a link, add the registry once, or hand your AI the prompt.',
    focus: { x: 82, y: 60, zoom: 1.55 },
  },
];

/** True once the page has scrolled past `at` pixels. Re-renders only when that flips. */
function useScrolled(at: number) {
  const { y } = useHomeScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(y, 'change', (v) => setScrolled(v > at));
  return scrolled;
}

/** The background, with a camera that moves to whichever link the menu is pointing at. It stays put while the page slides over it. */
function Scene({ items }: { items: Page[] }) {
  const { peek, open } = useTuckMenu();
  const { progress } = useHomeScroll();
  const reduce = useReducedMotion();
  const page = items[peek];
  const { x, y, zoom } = page.focus;

  // As the next section slides up, the picture drifts closer and falls into the night colour it is about to meet.
  const drift = useTransform(progress, [0, 1], [1, 1.12]);
  const dusk = useTransform(progress, [0, 1], [0, 0.9]);

  // How much of the picture the frame shows, so the camera can pan to the edge and no further.
  const frame = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(BG_ASPECT);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAspect(e.contentRect.width / Math.max(1, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const xRoom = (zoom - Math.min(1, aspect / BG_ASPECT)) * 50;
  const yRoom = (zoom - Math.min(1, BG_ASPECT / aspect)) * 50;

  return (
    <>
      <div ref={frame} className="absolute inset-0" />
      <motion.div style={reduce ? undefined : { scale: drift }} className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- one fixed background; the camera needs a plain element to move */}
        <motion.img
          src="/hero-bg.webp"
          alt=""
          fetchPriority="high"
          decoding="async"
          draggable={false}
          initial={reduce ? false : { opacity: 0, scale: zoom * 1.1 }}
          animate={{
            opacity: 1,
            scale: zoom,
            x: `${clamp(zoom * (50 - x), -xRoom, xRoom)}%`,
            y: `${clamp(zoom * (50 - y), -yRoom, yRoom)}%`,
          }}
          transition={{ duration: reduce ? 0 : 1.2, ease: EASE }}
          className="absolute top-1/2 left-1/2 h-auto w-[max(100%,calc(100cqh*1.7778))] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
        />
      </motion.div>
      {/* A little dark over everything, because the sky is pale and the type is white: an even veil, deeper behind the
          headline where the sky is brightest, and the corners pulled in. */}
      <div className="pointer-events-none absolute inset-0 bg-[#0c0820]/12" />
      {/* The pool behind the headline goes when the headline does (menu open), or it reads as a smudge. */}
      <motion.div
        aria-hidden
        initial={false}
        animate={{ opacity: open ? 0 : 1 }}
        transition={{ duration: 0.5 }}
        className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_58%_46%_at_50%_47%,rgba(12,6,32,0.44),transparent_75%)]"
      />
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_120%_100%_at_50%_45%,transparent_58%,rgba(8,4,24,0.3)_100%)]" />
      {/* The top keeps the navbar readable; the bottom holds the caption while the menu is open. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[26%] bg-linear-to-b from-black/25 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-linear-to-t from-black/45 to-transparent" />
      <motion.div aria-hidden style={{ opacity: dusk }} className="pointer-events-none absolute inset-0 bg-[#100e16]" />

      {/* What the card is showing. Only while the menu is open, so the closed page is just the picture and the bar. */}
      <motion.div
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.4, delay: open ? 0.3 : 0 }}
        className="pointer-events-none absolute bottom-[clamp(22px,7cqh,48px)] left-[clamp(18px,2.8cqw,40px)] grid w-[min(34rem,72%)] text-white"
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={peek}
            initial={{ opacity: 0, y: 14, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.45, ease: EASE }}
            className="self-end [grid-area:1/1]"
          >
            <p className="text-[clamp(28px,min(4.8cqw,9cqh),68px)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">{page.title}</p>
            <p className="mt-[0.9em] max-w-[34ch] text-[clamp(13px,1.2cqw,16px)] text-white/85">{page.caption}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}

/** A capsule of dark glass that grows out behind its content as `p` goes from 0 to 1: from the width of the text out to the full oval. */
function Glass({ p }: { p: MotionValue<number> }) {
  const scaleX = useTransform(p, [0, 1], [0.62, 1]);
  return (
    <motion.span
      aria-hidden
      style={{ opacity: p, scaleX }}
      className="pointer-events-none absolute inset-0 rounded-full bg-[#150c2c]/45 shadow-[0_12px_36px_-14px_rgba(10,4,30,0.8)] ring-1 ring-white/15 backdrop-blur-xl ring-inset"
    />
  );
}

/**
 * The navbar. At the top it is a bar: the mark, a pill of links, GitHub and Menu. Scroll and it comes apart into
 * separate capsules that each take their glass in turn: the mark and name first, then the links, then the buttons.
 * The links and GitHub fade out as the page tucks away, so the card is left clean.
 */
function NavBar({ items }: { items: Page[] }) {
  const { open } = useTuckMenu();
  const { y } = useHomeScroll();
  const reduce = useReducedMotion();
  const scrolled = useScrolled(48);
  const [hover, setHover] = useState<string | null>(null);
  const first = useRef(true);
  useEffect(() => {
    first.current = false;
  }, []);
  const lit = hover ?? 'Home';

  const pBrand = useSpring(useTransform(y, [0, 70], [0, 1]), FOLLOW);
  const pLinks = useSpring(useTransform(y, [24, 104], [0, 1]), FOLLOW);

  const intro = { initial: reduce ? (false as const) : { opacity: 0, y: -14, filter: 'blur(8px)' } };
  const fade = (delay: number) => ({ duration: open || reduce ? 0.2 : 0.7, delay: !open && first.current && !reduce ? delay : 0, ease: EASE });
  const gone = { opacity: open ? 0 : 1, y: open ? -8 : 0, filter: open ? 'blur(4px)' : 'blur(0px)' };

  return (
    <>
      <motion.div
        {...intro}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, delay: 0.1, ease: EASE }}
        className={`absolute left-[clamp(10px,1.8cqw,28px)] ${BAR_TOP} z-10`}
      >
        <Link
          href="/"
          aria-label={`${SITE.name}, home`}
          className="group relative flex h-9 items-center gap-2.5 rounded-full px-3 font-display text-[17px] font-semibold tracking-[-0.03em] text-white outline-none focus-visible:ring-2 focus-visible:ring-white/70 [text-shadow:0_1px_14px_rgba(0,0,0,0.25)]"
        >
          <Glass p={pBrand} />
          <Logo size={26} className="relative" />
          <span className="relative">{SITE.name}</span>
        </Link>
      </motion.div>

      <div className={`absolute left-1/2 ${BAR_TOP} z-10 -translate-x-1/2 max-md:hidden`}>
        <motion.nav aria-label="Main" {...intro} animate={gone} transition={fade(0.3)}>
          <ul onPointerLeave={() => setHover(null)} className="relative flex h-9 items-center rounded-full bg-black/15 px-1 ring-1 ring-white/20 backdrop-blur-md ring-inset">
            <Glass p={pLinks} />
            {items.map((p) => (
              <li key={p.label} className="relative">
                <Link
                  href={p.href}
                  aria-current={p.label === 'Home' ? 'page' : undefined}
                  onPointerEnter={() => setHover(p.label)}
                  onFocus={() => setHover(p.label)}
                  onBlur={() => setHover(null)}
                  className={`relative block rounded-full px-4 py-[6px] text-[13.5px] font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${lit === p.label ? 'text-white' : 'text-white/75'}`}
                >
                  {lit === p.label && (
                    <motion.span
                      layoutId="nav-lit"
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-white/20"
                      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative">{p.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.nav>
      </div>

      {/* Sits just left of the menu's own button (which is about 5.4rem wide). */}
      <motion.a
        href={SITE.github}
        target="_blank"
        rel="noreferrer"
        aria-label="Bender UI on GitHub"
        {...intro}
        animate={gone}
        transition={fade(0.4)}
        className={`absolute ${BAR_TOP} right-[calc(clamp(14px,2.2cqw,32px)+6.1rem)] z-10 grid size-9 place-items-center rounded-full text-white ring-1 transition-[background-color,box-shadow] duration-500 ring-inset focus-visible:ring-2 focus-visible:ring-white/70 ${scrolled ? CONTROL_SCROLLED : CONTROL_REST}`}
      >
        <GithubMark />
      </motion.a>
    </>
  );
}

/** Opening the menu tucks the page away, and the card previews the page from its top, so bring the page back to the top as it goes. */
function ScrollReset() {
  const { open } = useTuckMenu();
  const { ref } = useHomeScroll();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (open) ref.current?.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  }, [open, ref, reduce]);
  return null;
}

function MenuFooter() {
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <a
        href={SITE.github}
        target="_blank"
        rel="noreferrer"
        className="group flex items-center justify-between gap-3 rounded-[14px] bg-white/[0.06] p-3.5 text-white/85 ring-1 ring-white/10 transition-colors duration-300 ring-inset hover:bg-white/[0.11] hover:text-white"
      >
        <span className="flex items-center gap-2.5">
          <GithubMark size={16} />
          Star {SITE.name} on GitHub
        </span>
        <ArrowUpRight size={15} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </a>
      <p className="text-white/45">
        MIT licensed. From the makers of{' '}
        <a href={SITE.maker.url} className="text-white/70 underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60">
          {SITE.maker.name}
        </a>
        .
      </p>
    </div>
  );
}

function Shell({ items }: { items: MarqueeItem[] }) {
  const router = useRouter();
  const list = pages(items.length);
  const { ref } = useHomeScroll();
  const scrolled = useScrolled(48);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    router.prefetch('/components');
    router.prefetch('/docs');
    return () => clearTimeout(timer.current);
  }, [router]);

  // The menu's links are plain anchors. Take their clicks so the route changes client-side, after the card has mostly closed.
  const onClickCapture = (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('nav[aria-label="Site menu"] a[href]');
    const href = a?.getAttribute('href');
    if (!href || !href.startsWith('/')) return;
    e.preventDefault();
    if (href === '/') return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => router.push(href), 460);
  };

  return (
    <div onClickCapture={onClickCapture}>
      <TuckMenu
        label="Site menu"
        links={list.map(({ label, href, meta }) => ({ label, href, meta }))}
        footer={<MenuFooter />}
        className="[--tm-under:#100e16]"
        toggleClassName={scrolled ? TOGGLE_SCROLLED : undefined}
      >
        <Scene items={list} />
        <ScrollReset />
        {/* The page scrolls in here, not in the window, so it can still tuck away into the menu. */}
        <div ref={ref} className="absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin]">
          <div className="relative h-[100cqh]">
            <HomeHero />
          </div>
          <ComponentsMarquee items={items} />
          <WhatWeDo items={items} />
        </div>
        <NavBar items={list} />
      </TuckMenu>
    </div>
  );
}

/**
 * The home page. The Tuck Menu is the menu, and the page inside it scrolls: a hero, then the marquee of components.
 * Picking a link lets the card open back out before the route changes, so the menu closes instead of cutting away.
 */
export function HomeShell({ items }: { items: MarqueeItem[] }) {
  return (
    <HomeScrollProvider>
      <Shell items={items} />
    </HomeScrollProvider>
  );
}
