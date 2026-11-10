'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useTuckMenu } from '@registry/components/tuck-menu/tuck-menu';
import { SITE } from '@/lib/site';
import { GithubMark } from './github-mark';
import { useHomeScroll } from './home-scroll';

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Each one finishes "Premium components …". They describe real components in the library, so the line is a tour of it. */
const PHRASES = ['worth touching.', 'that tuck away.', 'that lift open.', 'that deal photos.', 'that grow as you point.', 'you actually own.'];

const LEAD = ['Premium', 'components'];

/** The typing caret. It is part of the line's width, so the invisible sizer below carries one too. */
function Caret({ blink = false }: { blink?: boolean }) {
  return <span className={`ml-[0.05em] inline-block h-[0.74em] w-[0.05em] translate-y-[0.05em] rounded-full bg-current ${blink ? 'caret-blink' : ''}`} />;
}
const TYPE_MS = 52; // per letter, with a little jitter so it reads as typed
const HOLD_MS = 2100; // how long a finished phrase stays
const LEAVE_MS = 520; // the fade out
const START_MS = 1250; // after the headline has landed

/**
 * Types each phrase letter by letter, holds it, fades it out, then moves to the next.
 * With reduced motion it simply shows the first phrase, complete.
 */
function useTyped(phrases: string[], still: boolean) {
  const [at, setAt] = useState(0);
  const [count, setCount] = useState(still ? phrases[0].length : 0);
  const [leaving, setLeaving] = useState(false);
  const [started, setStarted] = useState(false);
  const phrase = phrases[at];

  useEffect(() => {
    if (still) return;
    const t = setTimeout(() => setStarted(true), START_MS);
    return () => clearTimeout(t);
  }, [still]);

  useEffect(() => {
    if (still || !started) return;
    let t: ReturnType<typeof setTimeout>;
    if (leaving) {
      t = setTimeout(() => {
        setLeaving(false);
        setCount(0);
        setAt((a) => (a + 1) % phrases.length);
      }, LEAVE_MS);
    } else if (count < phrase.length) {
      t = setTimeout(() => setCount((c) => c + 1), TYPE_MS + Math.random() * 38);
    } else {
      t = setTimeout(() => setLeaving(true), HOLD_MS);
    }
    return () => clearTimeout(t);
  }, [still, started, leaving, count, phrase, phrases.length]);

  return { phrase, text: phrase.slice(0, count), typing: count < phrase.length, leaving };
}

/**
 * The home page's headline: big white type that lands word by word, a second line that types itself out and
 * finishes the sentence, then the one-line pitch and the two buttons. It fades away as the page tucks into the menu.
 */
export function HomeHero() {
  const { open } = useTuckMenu();
  const reduce = !!useReducedMotion();
  const { phrase, text, typing, leaving } = useTyped(PHRASES, reduce);
  // As the page scrolls, the headline drifts up and fades before the next section reaches it.
  const { progress } = useHomeScroll();
  const driftY = useTransform(progress, [0, 1], [0, -110]);
  const fadeOut = useTransform(progress, [0, 0.55], [1, 0]);

  const rise = (delay: number, y = 26) => ({
    initial: reduce ? false : { opacity: 0, y, filter: 'blur(12px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    transition: { duration: 1, delay, ease: EASE },
  });

  return (
    <motion.div style={reduce ? undefined : { y: driftY, opacity: fadeOut }} className="absolute inset-0">
      <motion.div
        initial={false}
        animate={{ opacity: open ? 0 : 1, y: open ? -14 : 0, filter: open ? 'blur(8px)' : 'blur(0px)' }}
        transition={{ duration: open ? 0.3 : 0.7, ease: EASE }}
        className="grid h-full place-items-center px-5 pt-16 pb-[5vh] text-center"
      >
        <div className="flex max-w-[1180px] flex-col items-center">
          <h1
            aria-label={`Premium components ${PHRASES[0]}`}
            className="font-display text-[clamp(2.3rem,7.6vw,7.4rem)] leading-[0.98] font-semibold tracking-[-0.04em] text-balance text-white [text-shadow:0_2px_44px_rgba(14,6,36,0.4)]"
          >
            <span aria-hidden className="block">
              {LEAD.map((w, i) => (
                <motion.span key={w} {...rise(0.35 + i * 0.12, 44)} className="mr-[0.2em] inline-block last:mr-0">
                  {w}
                </motion.span>
              ))}
            </span>
            {/* The invisible full phrase (caret included) gives the line its width, so typed letters never shift or wrap it. */}
            <span aria-hidden className="mt-[0.02em] block text-[#fcc6ec]">
              <span className="relative inline-block text-left">
                <span className="invisible">
                  {phrase}
                  <Caret />
                </span>
                <motion.span
                  initial={false}
                  animate={{ opacity: leaving ? 0 : 1, y: leaving ? -12 : 0, filter: leaving ? 'blur(9px)' : 'blur(0px)' }}
                  transition={{ duration: leaving ? 0.45 : 0, ease: EASE }}
                  className="absolute inset-0"
                >
                  {text}
                  <Caret blink={!typing} />
                </motion.span>
              </span>
            </span>
          </h1>

          <motion.p
            {...rise(1.25, 18)}
            className="mt-7 max-w-[46ch] text-[clamp(16px,1.35vw,19px)] leading-[1.6] text-white/85 [text-shadow:0_1px_20px_rgba(14,6,36,0.35)]"
          >
            Open-source React components you can try live on the page, then take with one command.
          </motion.p>

          <motion.div {...rise(1.45, 18)} className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/components"
              transitionTypes={['nav-forward']}
              className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-full bg-white px-6 text-[15px] font-medium text-[#1a1230] shadow-[0_14px_34px_-14px_rgba(20,8,50,0.7)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-white"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-[#cdb9ff]/55 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
              />
              <span className="relative">Browse the components</span>
              <ArrowRight size={16} aria-hidden className="relative transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a
              href={SITE.github}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white/10 px-5 text-[15px] font-medium text-white ring-1 ring-white/25 backdrop-blur-md transition-colors duration-300 ring-inset hover:bg-white/20 focus-visible:outline-white"
            >
              <GithubMark size={17} />
              GitHub
            </a>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}
