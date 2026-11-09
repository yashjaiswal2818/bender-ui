'use client';

import { motion, useInView, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import { ArrowUpRight, Check, MousePointer2 } from 'lucide-react';
import { SITE, registryUrl } from '@/lib/site';
import type { MarqueeItem } from './components-marquee';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** The colours are the hero picture's own: coral and peach from the sky, teal and navy from the hills. Flat shapes, no shadows. */
const INK = '#17141a';
const PEACH = '#f8dcc8';

/** `edge` is how far into the screen it must come before it shows. The last thing on the page uses 0: it can never get 12% in. */
const reveal = (delay = 0, edge = '-12%') => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: `0px 0px ${edge} 0px` },
  transition: { duration: 1, delay, ease: EASE },
});

/** Counts up on a timer, but only while `run` is true, so a face out of view (or under reduced motion) does no work. */
function useTick(ms: number, run: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!run) return;
    const id = setInterval(() => setTick((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms, run]);
  return tick;
}

/**
 * The picture at the top of a card, in the marquee's own tile shape: a gradient taken from the hero, with flat drawing on it.
 * Everything inside is sized in em off the tile's width, so each face scales as a miniature.
 */
function Face({ ref, gradient, children }: { ref?: Ref<HTMLDivElement>; gradient: string; children: ReactNode }) {
  return (
    <div ref={ref} aria-hidden className={`@container relative aspect-[4/3] overflow-hidden rounded-[22px] ring-1 ring-white/10 ${gradient}`}>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- 1. Spot it */

/** Small flat drawings of the kind of thing worth keeping. Each is built from the tile's own em, so none of them needs a size. */
const FRAGMENTS: (() => ReactNode)[] = [
  // a nav pill
  () => (
    <span className="flex items-center gap-[0.6em] rounded-full bg-white px-[0.9em] py-[0.7em]">
      <span className="block h-[0.5em] w-[1.5em] rounded-full bg-[#17141a]" />
      <span className="block h-[0.5em] w-[1.5em] rounded-full bg-[#17141a]/25" />
      <span className="block h-[0.5em] w-[1.5em] rounded-full bg-[#17141a]/25" />
    </span>
  ),
  // a switch
  () => (
    <span className="relative block h-[1.9em] w-[3.4em] rounded-full bg-white">
      <span className="absolute top-[0.25em] left-[0.25em] size-[1.4em] translate-x-[1.5em] rounded-full bg-[#17141a]" />
    </span>
  ),
  // segmented tabs
  () => (
    <span className="flex gap-[0.3em] rounded-full bg-white/45 p-[0.3em]">
      <span className="block h-[1.3em] w-[1.5em] rounded-full bg-[#17141a]" />
      <span className="block h-[1.3em] w-[1.5em] rounded-full bg-white/80" />
      <span className="block h-[1.3em] w-[1.5em] rounded-full bg-white/80" />
    </span>
  ),
  // a slider
  () => (
    <span className="relative block h-[0.4em] w-[5em] rounded-full bg-white/70">
      <span className="absolute inset-y-0 left-0 w-[60%] rounded-full bg-[#17141a]" />
      <span className="absolute top-1/2 left-[60%] size-[1.3em] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ring-[0.2em] ring-[#17141a]" />
    </span>
  ),
  // a card
  () => (
    <span className="block w-[4.6em] space-y-[0.4em] rounded-[0.8em] bg-white p-[0.6em]">
      <span className="block h-[1.6em] rounded-[0.4em] bg-[#17141a]/15" />
      <span className="block h-[0.35em] w-[80%] rounded-full bg-[#17141a]/45" />
      <span className="block h-[0.35em] w-[50%] rounded-full bg-[#17141a]/25" />
    </span>
  ),
  // a stack of avatars
  () => (
    <span className="flex">
      <span className="block size-[2.1em] rounded-full bg-[#17141a] ring-[0.2em] ring-white" />
      <span className="-ml-[0.6em] block size-[2.1em] rounded-full bg-white ring-[0.2em] ring-white" />
      <span className="-ml-[0.6em] block size-[2.1em] rounded-full bg-[#f8dcc8] ring-[0.2em] ring-white" />
    </span>
  ),
];

/** The order the frame visits them in, so it doesn't just sweep left to right. */
const VISIT = [0, 4, 2, 5, 1, 3];

/** A spread of small interface pieces, and a frame that moves from one to the next and picks it. */
function SpotFace() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' });
  const tick = useTick(1700, inView && !reduce);
  const active = VISIT[tick % VISIT.length];

  return (
    <Face
      ref={ref}
      gradient="bg-[radial-gradient(90%_70%_at_100%_0%,rgba(255,244,232,0.55),transparent_65%),linear-gradient(145deg,#f8dcc8_0%,#f0afa6_48%,#e3818e_100%)]"
    >
      <div className="absolute inset-[9%] grid grid-cols-3 grid-rows-2 gap-[4%] text-[clamp(9px,2.7cqw,12px)]">
        {FRAGMENTS.map((Fragment, i) => (
          <div key={i} className="relative grid place-items-center">
            <div className={`transition-opacity duration-500 ${i === active ? 'opacity-100' : 'opacity-55'}`}>{Fragment()}</div>
            {i === active && (
              <motion.span
                layoutId="spot-frame"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 30 }}
                className="pointer-events-none absolute -inset-[4%] rounded-[1em] ring-2 ring-[#17141a]"
              >
                <span className="absolute -top-[1.1em] left-[0.7em] rounded-full bg-[#17141a] px-[0.7em] py-[0.15em] text-[0.8em] font-semibold whitespace-nowrap text-white">
                  Worth keeping
                </span>
                <MousePointer2 aria-hidden strokeWidth={1.5} className="absolute -right-[0.8em] -bottom-[1em] size-[1.7em] fill-[#17141a] text-white" />
              </motion.span>
            )}
          </div>
        ))}
      </div>
    </Face>
  );
}

/* -------------------------------------------------------------- 2. Rebuild it */

type Tok = [text: string, tone: 'k' | 'f' | 'a' | 's' | 'p' | 't'];

const TONE: Record<Tok[1], string> = {
  k: 'text-[#f3b193]', // keyword
  f: 'text-[#fbeee3]', // name
  a: 'text-white/80', // attribute
  s: 'text-[#8fd3d8]', // string
  p: 'text-white/40', // punctuation
  t: 'text-white/70', // expression
};

/** A small, plain illustration of "new code": a switch, written fresh. */
const CODE: Tok[][] = [
  [['export ', 'k'], ['function ', 'k'], ['Switch', 'f'], ['({ on, set }) {', 'p']],
  [['  return (', 'p']],
  [['    <', 'p'], ['button', 'f']],
  [['      role', 'a'], ['=', 'p'], ['"switch"', 's']],
  [['      aria-checked', 'a'], ['=', 'p'], ['{on}', 't']],
  [['      onClick', 'a'], ['=', 'p'], ['{() => set(!on)}', 't']],
  [['    />', 'p']],
  [['  )', 'p']],
  [['}', 'p']],
];

const lineVariants = {
  off: { opacity: 0, x: -8 },
  on: { opacity: 1, x: 0, transition: { duration: 0.5, ease: EASE } },
};

/** Code that writes itself in, and the thing it makes, working beside it. */
function RebuildFace() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const written = useInView(ref, { margin: '0px 0px -10% 0px', once: true });
  const live = useInView(ref, { margin: '0px 0px -10% 0px' });
  const tick = useTick(1800, live && !reduce);
  const on = reduce ? true : tick % 2 === 1;

  return (
    <Face
      ref={ref}
      gradient="bg-[radial-gradient(90%_70%_at_0%_0%,rgba(236,248,246,0.7),transparent_65%),linear-gradient(145deg,#cfe5e3_0%,#8fc3c6_46%,#3d7c89_100%)]"
    >
      <div className="absolute inset-x-[7%] top-[7%] bottom-[7%] overflow-hidden rounded-[0.9em] bg-[#12171c] text-[clamp(10px,3.05cqw,12.5px)]">
        <div className="flex items-center gap-[0.6em] border-b border-white/10 px-[1em] py-[0.65em] font-mono text-[0.85em] text-white/50">
          <span className="block size-[0.6em] rounded-full bg-[#f3b193]" />
          switch.tsx
        </div>
        <motion.pre
          initial={reduce ? 'on' : 'off'}
          animate={written ? 'on' : 'off'}
          variants={{ off: {}, on: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
          className="px-[1em] py-[0.8em] font-mono leading-[1.55]"
        >
          {CODE.map((line, i) => (
            <motion.div key={i} variants={lineVariants} className="whitespace-pre">
              {line.map(([text, tone], j) => (
                <span key={j} className={TONE[tone]}>
                  {text}
                </span>
              ))}
            </motion.div>
          ))}
        </motion.pre>
      </div>

      {/* What that code makes. It flips by itself, so the piece is seen working next to the lines that wrote it. */}
      <div className="absolute right-[11%] bottom-[11%] flex items-center gap-[0.9em] rounded-full bg-white py-[0.6em] pr-[0.7em] pl-[1.1em] text-[clamp(10px,3.05cqw,12.5px)]">
        <span className="font-medium text-[#17141a]">Result</span>
        <span className={`relative block h-[1.9em] w-[3.4em] rounded-full transition-colors duration-500 ${on ? 'bg-[#17141a]' : 'bg-[#17141a]/20'}`}>
          <span className={`absolute top-[0.25em] left-[0.25em] size-[1.4em] rounded-full bg-white transition-transform duration-500 ease-[var(--ease-out)] ${on ? 'translate-x-[1.5em]' : ''}`} />
        </span>
      </div>
    </Face>
  );
}

/* ---------------------------------------------------------------- 3. Ship it */

const DAYS = ['M', 'T', 'W', 'T', 'F'];

/** Five days, five tiles that fill in one after another, and the one command that takes any of them. */
function ShipFace({ command, url }: { command: string; url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { margin: '0px 0px -10% 0px' });
  const tick = useTick(620, inView && !reduce);
  // Fills one a tick, rests a moment with all five in, then starts over.
  const lit = reduce ? DAYS.length : Math.min(DAYS.length, tick % 9);

  return (
    <Face
      ref={ref}
      gradient="bg-[linear-gradient(150deg,#3a8590_0%,#22506a_50%,#16283a_100%)]"
    >
      <div className="absolute inset-[7%] flex flex-col justify-center gap-[7%] text-[clamp(10px,3cqw,12.5px)]">
        <div className="grid grid-cols-5 gap-[3.5%]">
          {DAYS.map((d, i) => {
            const on = i < lit;
            return (
              <div
                key={i}
                className={`flex aspect-[1/1.35] flex-col items-center justify-between rounded-[0.8em] p-[0.7em] transition-colors duration-500 ${on ? 'bg-[#f8dcc8]' : 'bg-white/10'}`}
              >
                <span className={`font-semibold transition-colors duration-500 ${on ? 'text-[#17141a]' : 'text-white/45'}`}>{d}</span>
                <span
                  className={`grid size-[1.9em] place-items-center rounded-full bg-[#17141a] text-[#f8dcc8] transition-[opacity,transform] duration-500 ease-[var(--ease-out)] ${
                    on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                >
                  <Check aria-hidden strokeWidth={3} className="size-[1.1em]" />
                </span>
              </div>
            );
          })}
        </div>
        <div className="overflow-hidden rounded-[0.8em] bg-black/35 px-[1em] py-[0.8em] font-mono text-[0.85em] leading-[1.6] whitespace-nowrap">
          <p className="text-white/85">
            <span className="text-[#f3b193]">$ </span>
            {command}
          </p>
          <p className="overflow-hidden text-ellipsis text-white/50">{url}</p>
        </div>
      </div>
    </Face>
  );
}

/* ------------------------------------------------------------------ Section */

/**
 * The section under the marquee: what Bender UI actually does. It does not design components of its own. It finds the best
 * public interface work, rebuilds the idea as new code, and ships five a week. Three cards, in the marquee's own tile.
 */
export function WhatWeDo({ items }: { items: MarqueeItem[] }) {
  const sample = items[0]?.name ?? 'component';
  const steps = [
    {
      title: 'Spot it',
      tag: 'Public work',
      body: 'We keep watch on the best interface work that’s out in the open, and pick the interactions worth having in your toolbox.',
      face: <SpotFace />,
    },
    {
      title: 'Rebuild it',
      tag: 'React + Tailwind',
      body: 'The idea becomes new code: written fresh in React, Tailwind and motion. Inspired by the original, never copied from it.',
      face: <RebuildFace />,
    },
    {
      title: 'Ship it',
      tag: '5 a week',
      body: 'Five new components land every week. Each is a single command away, and from then on it’s your code.',
      face: <ShipFace command="npx shadcn@latest add" url={registryUrl(sample)} />,
    },
  ];

  return (
    <section aria-labelledby="what" className="relative overflow-hidden border-t border-white/10 bg-[#100e16] text-white">
      <div className="relative mx-auto max-w-[1240px] px-5 pt-[clamp(48px,8vh,88px)] pb-[clamp(28px,5vh,48px)] sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-x-12 gap-y-6">
          <motion.h2
            id="what"
            {...reveal()}
            className="max-w-[20ch] font-display text-[clamp(2.2rem,5.2vw,4.6rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance"
          >
            Good ideas are everywhere. We turn them into code.
          </motion.h2>
          <motion.p {...reveal(0.1)} className="max-w-[44ch] text-[clamp(15px,1.25vw,18px)] leading-[1.6] text-white/60">
            We don’t design components in a vacuum. We study the best interface work that’s publicly out there, take the idea, and write it again from scratch as clean code you can own.
          </motion.p>
        </div>

        <ul className="mt-[clamp(32px,6vh,64px)] grid gap-x-5 gap-y-10 lg:grid-cols-3">
          {steps.map((s, i) => (
            <motion.li key={s.title} {...reveal(0.08 * i)} className="group/card grid gap-4 sm:grid-cols-2 sm:items-center sm:gap-8 lg:block">
              {s.face}
              <div className="lg:mt-3.5">
                <div className="flex items-baseline justify-between gap-3 px-1">
                  <h3 className="font-display text-[18px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                  <span className="shrink-0 text-[13px] text-white/45">{s.tag}</span>
                </div>
                <p className="mt-2 max-w-[44ch] px-1 text-[14.5px] leading-[1.6] text-white/60">{s.body}</p>
              </div>
            </motion.li>
          ))}
        </ul>

        <motion.div
          {...reveal(0.1, '0px')}
          className="mt-[clamp(40px,7vh,72px)] flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-white/10 pt-6 text-[14px] text-white/55"
        >
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            Seen one we should rebuild?
            <a
              href={`${SITE.github}/issues/new`}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1 rounded-sm font-medium text-white underline decoration-white/30 underline-offset-4 outline-none transition-colors duration-300 hover:decoration-white focus-visible:ring-2 focus-visible:ring-[#fabdf1]"
            >
              Tell us
              <ArrowUpRight size={15} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </p>
          <p>
            MIT licensed. From the makers of{' '}
            <a
              href={SITE.maker.url}
              className="rounded-sm text-white/75 underline decoration-white/25 underline-offset-4 outline-none transition-colors hover:text-white hover:decoration-white/60 focus-visible:ring-2 focus-visible:ring-[#fabdf1]"
            >
              {SITE.maker.name}
            </a>
            .
          </p>
        </motion.div>
      </div>
    </section>
  );
}
