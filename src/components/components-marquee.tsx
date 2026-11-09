'use client';
/* eslint-disable @next/next/no-img-element -- fixed local stills with known sizes */

import Link from 'next/link';
import { motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useSpring, useTransform, useVelocity } from 'motion/react';
import { useRef } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useHomeScroll } from './home-scroll';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export interface MarqueeItem {
  name: string;
  title: string;
  category: string;
  href: string;
  /** A still of the live demo. */
  src: string;
}

/** Three copies of a row sit side by side and it slides one copy's width, so the loop has no seam even on a very wide screen. */
const COPIES = 3;
/** How slow a row drifts while you point at it, as a share of its normal speed. */
const HOVER_PACE = 0.14;

const wrap = (min: number, max: number, v: number) => {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
};

function Card({ item, tabbable }: { item: MarqueeItem; tabbable: boolean }) {
  return (
    <Link
      href={item.href}
      tabIndex={tabbable ? 0 : -1}
      draggable={false}
      className="group/card block w-[clamp(240px,25vw,360px)] outline-none transition-opacity duration-500 group-hover/row:not-hover:opacity-45 focus-visible:[&>div]:ring-2 focus-visible:[&>div]:ring-[#fabdf1]"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-[#1b1626] ring-1 ring-white/10 transition-[transform,box-shadow] duration-500 ease-[var(--ease-out)] group-hover/card:-translate-y-2 group-hover/card:shadow-[0_34px_60px_-26px_rgba(0,0,0,0.85)]">
        <img
          src={item.src}
          width={1000}
          height={750}
          alt={tabbable ? `${item.title}, a ${item.category.toLowerCase()} component` : ''}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="size-full object-cover transition-transform duration-[900ms] ease-[var(--ease-out)] group-hover/card:scale-[1.06]"
        />
        <span
          aria-hidden
          className="absolute top-3 right-3 grid size-9 -translate-y-1 scale-90 place-items-center rounded-full bg-white text-[#1a1230] opacity-0 transition-all duration-400 ease-[var(--ease-out)] group-hover/card:translate-y-0 group-hover/card:scale-100 group-hover/card:opacity-100"
        >
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="mt-3.5 flex items-baseline justify-between gap-3 px-1">
        <h3 className="font-display text-[18px] font-semibold tracking-[-0.02em] text-white">{item.title}</h3>
        <span className="shrink-0 text-[13px] text-white/45">{item.category}</span>
      </div>
    </Link>
  );
}

/**
 * One endless row. It drifts at its own pace, picks up speed while the page is being scrolled, and eases almost to
 * a stop when you point at it. Out of view it does no work at all. With reduced motion it is a plain scrollable row.
 */
function Track({ items, dir, speed }: { items: MarqueeItem[]; dir: 1 | -1; speed: number }) {
  const reduce = useReducedMotion();
  const { y } = useHomeScroll();
  const box = useRef<HTMLDivElement>(null);
  const inView = useInView(box, { margin: '240px 0px' });

  const offset = useMotionValue(0);
  const smooth = useSpring(useVelocity(y), { damping: 50, stiffness: 400 });
  const boost = useTransform(smooth, (v) => Math.min(Math.abs(v) / 900, 4));
  const pace = useSpring(1, { stiffness: 110, damping: 22 });
  const x = useTransform(offset, (v) => `${wrap(-100 / COPIES, 0, v)}%`);

  useAnimationFrame((_, delta) => {
    if (reduce || !inView) return;
    // A long gap (a hidden tab) must not make the row jump.
    const dt = Math.min(delta, 64) / 1000;
    offset.set(offset.get() + dir * speed * dt * pace.get() * (1 + boost.get()));
  });

  const slow = () => pace.set(HOVER_PACE);
  const resume = () => pace.set(1);
  const copies = reduce ? 1 : COPIES;

  return (
    <div
      ref={box}
      onPointerEnter={slow}
      onPointerLeave={resume}
      onFocusCapture={slow}
      onBlurCapture={resume}
      className={`group/row ${reduce ? 'overflow-x-auto' : 'overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]'} py-3`}
    >
      <motion.div style={reduce ? undefined : { x }} className="flex w-max will-change-transform">
        {Array.from({ length: copies }, (_, c) => (
          <ul key={c} aria-hidden={c > 0 || undefined} inert={c > 0} className="flex shrink-0 gap-5 pr-5">
            {items.map((item) => (
              <li key={item.name}>
                <Card item={item} tabbable={c === 0} />
              </li>
            ))}
          </ul>
        ))}
      </motion.div>
    </div>
  );
}

/** The section under the hero: every component built so far, as two rows that never stop moving. */
export function ComponentsMarquee({ items }: { items: MarqueeItem[] }) {
  const n = items.length;
  const half = Math.ceil(n / 2);
  // The second row starts from the other half of the set, so at any moment the two rows show different components.
  const second = [...items.slice(half), ...items.slice(0, half)];

  const reveal = (delay = 0) => ({
    initial: { opacity: 0, y: 36 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: '0px 0px -12% 0px' },
    transition: { duration: 1, delay, ease: EASE },
  });

  return (
    <section
      aria-labelledby="built"
      className="relative overflow-hidden rounded-t-[clamp(24px,3.2vw,48px)] border-t border-white/10 bg-[#100e16] text-white shadow-[0_-40px_90px_-30px_rgba(8,4,24,0.7)]"
    >
      {/* Soft light, so the dark isn't flat: violet from above, pink from the corner. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[75%] [background:radial-gradient(60%_60%_at_50%_0%,rgba(160,120,230,0.2),transparent_70%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[60%] [background:radial-gradient(50%_60%_at_15%_100%,rgba(250,189,241,0.1),transparent_70%)]" />

      <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-x-10 gap-y-6 px-5 pt-[clamp(72px,13vh,150px)] pb-[clamp(32px,6vh,64px)] sm:px-8">
        <div>
          <motion.h2
            id="built"
            {...reveal()}
            className="max-w-[16ch] font-display text-[clamp(2.2rem,5.2vw,4.6rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance"
          >
            Everything we’ve built so far.
          </motion.h2>
          <motion.p {...reveal(0.1)} className="mt-5 max-w-[46ch] text-[clamp(15px,1.25vw,18px)] leading-[1.6] text-white/60">
            {n} live components, each one a single command away. Point at a row to slow it down, then pick one to open.
          </motion.p>
        </div>
        <motion.div {...reveal(0.18)}>
          <Link
            href="/components"
            className="group inline-flex h-12 items-center gap-2 rounded-full bg-white/10 px-6 text-[15px] font-medium text-white ring-1 ring-white/20 backdrop-blur-md transition-colors duration-300 ring-inset hover:bg-white/20"
          >
            See all {n}
            <ArrowRight size={16} aria-hidden className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </motion.div>
      </div>

      <motion.div {...reveal(0.12)} className="relative flex flex-col gap-3 pb-[clamp(72px,14vh,160px)]">
        <Track items={items} dir={-1} speed={0.62} />
        <Track items={second} dir={1} speed={0.5} />
      </motion.div>
    </section>
  );
}
