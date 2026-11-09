'use client';

import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useMotionValue, useScroll, useTransform, type MotionValue } from 'motion/react';

interface HomeScroll {
  /** The element the home page scrolls inside. The page scrolls in here, not in the window, so it can still tuck away into the menu. */
  ref: RefObject<HTMLDivElement | null>;
  /** Pixels scrolled. */
  y: MotionValue<number>;
  /** 0 at the top, 1 once the first screen has scrolled away. */
  progress: MotionValue<number>;
}

const Ctx = createContext<HomeScroll | null>(null);

/** Shares the home page's scroll position with the navbar, the hero, the background and the marquee. */
export function HomeScrollProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollY: y } = useScroll({ container: ref });
  const height = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => height.set(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);
  const progress = useTransform([y, height], ([v, h]: number[]) => (h ? Math.min(1, Math.max(0, v / h)) : 0));
  return <Ctx.Provider value={{ ref, y, progress }}>{children}</Ctx.Provider>;
}

export function useHomeScroll() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useHomeScroll must be used inside <HomeScrollProvider>');
  return ctx;
}
