"use client";

import {
  animate,
  motion,
  motionValue,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotionConfig,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface FoldCard {
  id: string;
  /** Heading of the card, also its accessible name. */
  title: string;
  /** Small picture before the title, such as an icon on a tint or a photo thumbnail. */
  icon?: ReactNode;
  /** Right side of the folded pill: a short status. Stays while open unless there's an `aside`. */
  meta?: ReactNode;
  /** Right side of the header while open, e.g. actions. Takes over from `meta` as the card unfolds. */
  aside?: ReactNode;
  /** The open card's body. Keep it under ~330px tall; taller content is clipped. */
  content: ReactNode;
  /** The body owns the whole open card; the header only shows while folded. */
  bare?: boolean;
  /** Fills the card behind everything, folded or open: a photo for a banner card, say. */
  backdrop?: ReactNode;
  /** "ink" for a dark card. */
  tone?: "paper" | "ink";
}

export interface FoldStackProps {
  /** In order, top to bottom. */
  cards: FoldCard[];
  /** Height of the scrolling window, in px. */
  height?: number;
  /** The card that starts open. */
  defaultIndex?: number;
  /** Called when another card opens, by scrolling or a click. */
  onActiveChange?: (index: number, card: FoldCard) => void;
  /** Accessible name of the scrolling window. */
  label?: string;
  className?: string;
}

/** Height of a folded card. With the 28px radius it's a full pill. */
const PILL = 56;
/** Height of an open card's header. */
const HEADER = 72;
const GAP = 10;
/** Scroll distance from one card to the next. */
const STEP = 240;
/** What an unmeasured card is assumed to need, for the server render. */
const ESTIMATE = 300;
/** Scroll this far past a card (in cards) and letting go moves on to the next one. */
const NUDGE = 0.06;
/** How long the scroll has to be quiet before the stack settles on a card. */
const SETTLE_MS = 120;
const SCROLL_SPRING = { stiffness: 320, damping: 40, mass: 0.7 };

const THEME = cn(
  "[--fold-stage:#edece8] [--fold-paper:#fff] [--fold-ink:#151517] [--fold-muted:#75757d] [--fold-line:rgb(0_0_0/0.07)] [--fold-chip:#f3f2ef]",
  "dark:[--fold-stage:#121214] dark:[--fold-paper:#1e1e22] dark:[--fold-ink:#f4f4f5] dark:[--fold-muted:#a1a1aa] dark:[--fold-line:rgb(255_255_255/0.08)] dark:[--fold-chip:#2a2a2f]",
);
const PAPER = "bg-(--fold-paper) text-(--fold-ink)";
// An ink card re-points the theme at itself, so headers and content inside it read light on dark.
const INK =
  "bg-[#141519] text-white [--fold-ink:#fff] [--fold-muted:rgb(255_255_255/0.6)] [--fold-line:rgb(255_255_255/0.1)] [--fold-chip:rgb(255_255_255/0.1)] dark:bg-[#2b2c33]";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

const subscribe = () => () => {};
/** Reduced motion, but only once hydrated, so the first client render matches the server's. */
function useStill() {
  const reduce = useReducedMotionConfig();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated && reduce === true;
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

interface Pose {
  y: number;
  h: number;
  /** 1 when this card is the open one, 0 once it's a full step away. */
  open: number;
  /** Distance from the focus, in cards. */
  dist: number;
}

/** Where everything sits when card `k` is exactly in focus: it's centred, the rest are pills above and below. */
function restAt(k: number, heights: number[], stage: number) {
  const top = (stage - heights[k]) / 2;
  return heights.map((_, j) => {
    if (j === k) return { y: top, h: heights[k] };
    if (j < k) return { y: top - (k - j) * (PILL + GAP), h: PILL };
    return { y: top + heights[k] + GAP + (j - k - 1) * (PILL + GAP), h: PILL };
  });
}

/**
 * Between two resting layouts, every position and height is blended by the same amount. Both layouts keep a
 * GAP between neighbours, so the blend does too: cards never overlap mid-scroll.
 */
function posesAt(p: number, heights: number[], stage: number): Pose[] {
  const last = heights.length - 1;
  const k0 = clamp(Math.floor(p), 0, last);
  const k1 = Math.min(k0 + 1, last);
  const t = clamp(p - k0, 0, 1);
  const a = restAt(k0, heights, stage);
  const b = restAt(k1, heights, stage);
  return a.map((from, j) => {
    const dist = Math.abs(p - j);
    return { y: lerp(from.y, b[j].y, t), h: lerp(from.h, b[j].h, t), open: Math.max(0, 1 - dist), dist };
  });
}

/** Every animated number on a card, for a given pose. */
function look(pose: Pose, still: boolean) {
  const { open: o, dist: d } = pose;
  // The body waits until the card is nearly open, then sharpens into place.
  const body = smoothstep(clamp((o - 0.45) / 0.55, 0, 1));
  return {
    y: pose.y,
    h: pose.h,
    width: d <= 1 ? lerp(100, 88, d) : d <= 2 ? lerp(88, 80, d - 1) : 80,
    opacity: d <= 1 ? 1 : d <= 2 ? lerp(1, 0.5, d - 1) : d <= 3 ? lerp(0.5, 0, d - 2) : 0,
    z: 100 - Math.round(d * 10),
    headerH: lerp(PILL, HEADER, o),
    pad: lerp(12, 20, o),
    icon: lerp(32, 40, o),
    title: lerp(0.84, 1, o),
    meta: clamp(1 - o * 2.2, 0, 1),
    aside: clamp((o - 0.5) * 2, 0, 1),
    cover: clamp(1 - o * 1.6, 0, 1),
    body,
    blur: still ? 0 : (1 - body) * 10,
    lift: still ? 0 : (1 - body) * 14,
  };
}
type Look = ReturnType<typeof look>;

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

interface FoldCardState {
  /** This card is the open one. Start entrance animations from it. */
  open: boolean;
  index: number;
  /** Scrolls the stack to a card. */
  goTo: (index: number) => void;
}

const FoldCardContext = createContext<FoldCardState>({ open: true, index: 0, goTo: () => {} });
/** For content inside a card: whether it's open, and a way to move the stack. */
export const useFoldCard = () => useContext(FoldCardContext);

interface CardProps {
  card: FoldCard;
  index: number;
  open: boolean;
  hidden: boolean;
  seed: Pose;
  still: boolean;
  register: (id: string, paint: (pose: Pose) => void) => () => void;
  onMeasure: (id: string, height: number) => void;
  goTo: (index: number) => void;
}

function Card({ card, index, open, hidden, seed, still, register, onMeasure, goTo }: CardProps) {
  // One motion value per animated number. The stack sets them all on every scroll frame, so nothing re-renders.
  const [mv] = useState(() => {
    const first = look(seed, false);
    return Object.fromEntries(Object.entries(first).map(([k, v]) => [k, motionValue(v)])) as Record<keyof Look, MotionValue<number>>;
  });
  const width = useTransform(mv.width, (w) => `${w}%`);
  const visibility = useTransform(mv.opacity, (o) => (o < 0.01 ? "hidden" : "visible"));
  const filter = useTransform(mv.blur, (b) => (b < 0.1 ? "none" : `blur(${b}px)`));
  const body = useRef<HTMLDivElement>(null);

  const paint = useCallback(
    (pose: Pose) => {
      const next = look(pose, still);
      for (const key in next) mv[key as keyof Look].set(next[key as keyof Look]);
    },
    [mv, still],
  );
  useIsoLayoutEffect(() => register(card.id, paint), [register, card.id, paint]);

  useIsoLayoutEffect(() => {
    const el = body.current;
    if (!el) return;
    const report = () => onMeasure(card.id, el.offsetHeight + (card.bare ? 0 : HEADER));
    report();
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => observer.disconnect();
  }, [card.id, card.bare, onMeasure]);

  const ink = card.tone === "ink";
  return (
    <motion.div
      data-fold-card={card.id}
      data-open={open || undefined}
      aria-hidden={hidden || undefined}
      style={{ y: mv.y, height: mv.h, width, opacity: mv.opacity, zIndex: mv.z, visibility }}
      className={cn(
        "absolute left-1/2 top-0 -translate-x-1/2 overflow-clip rounded-[28px] shadow-[0_1px_1px_rgb(0_0_0/0.03),0_12px_30px_-14px_rgb(0_0_0/0.24)]",
        ink ? INK : PAPER,
        !open && "transition-[scale] duration-200 hover:scale-[1.015]",
      )}
    >
      {card.backdrop && (
        <div aria-hidden className="absolute inset-0">
          <FoldCardContext.Provider value={{ open, index, goTo }}>{card.backdrop}</FoldCardContext.Provider>
        </div>
      )}
      <motion.div
        className="absolute inset-x-0 top-0 flex items-center justify-between gap-3"
        style={{ height: mv.headerH, paddingLeft: mv.pad, paddingRight: mv.pad, opacity: card.bare ? mv.cover : 1 }}
      >
        {/* The title keeps its room on narrow cards; the status on the right truncates first. */}
        <div className="flex min-w-0 max-w-[64%] shrink-0 items-center gap-3">
          <motion.span
            style={{ width: mv.icon, height: mv.icon }}
            className="grid shrink-0 place-items-center overflow-clip rounded-full bg-(--fold-chip) [&_img]:size-full [&_img]:object-cover [&_svg]:size-4"
          >
            {card.icon}
          </motion.span>
          <motion.span style={{ scale: mv.title }} className="origin-left truncate text-[17px] font-medium tracking-[-0.011em]">
            {card.title}
          </motion.span>
        </div>
        <div className="grid min-w-0 grid-cols-[minmax(0,auto)] justify-items-end text-[12.5px] text-(--fold-muted)">
          {card.meta && (
            <motion.div
              style={{ opacity: card.aside ? mv.meta : 1 }}
              className="col-start-1 row-start-1 min-w-0 max-w-full self-center overflow-hidden whitespace-nowrap"
            >
              {card.meta}
            </motion.div>
          )}
          {card.aside && (
            <motion.div style={{ opacity: mv.aside }} className="col-start-1 row-start-1 self-center" inert={!open}>
              {card.aside}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* The body is laid out at the open width the whole time (100cqw of the stage), so it never reflows while
          the card narrows into a pill; the card just clips it. */}
      <motion.div
        className="absolute left-1/2 w-[100cqw] -translate-x-1/2"
        style={{ top: card.bare ? 0 : HEADER, opacity: mv.body, filter, y: mv.lift }}
        inert={!open}
      >
        <div ref={body} className={card.bare ? undefined : "px-5 pb-5"}>
          <FoldCardContext.Provider value={{ open, index, goTo }}>{card.content}</FoldCardContext.Provider>
        </div>
      </motion.div>

      {!open && (
        <button
          type="button"
          tabIndex={hidden ? -1 : 0}
          aria-label={`Open ${card.title}`}
          onClick={() => goTo(index)}
          className="absolute inset-0 z-10 cursor-pointer rounded-[inherit] outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--fold-ink)/30"
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Stack                                                               */
/* ------------------------------------------------------------------ */

/**
 * A window of cards driven by its own scroll. The card in the middle is open; the ones before and after fold
 * into pills above and below it. Scrolling unfolds the next card while the current one folds away, frame by frame
 * with the wheel or finger, then settles on a card. Click a pill or a dot to jump, or use the arrow keys.
 */
export function FoldStack({
  cards,
  height = 560,
  defaultIndex = 0,
  onActiveChange,
  label = "Cards",
  className,
}: FoldStackProps) {
  const still = useStill();
  const n = cards.length;
  const start = clamp(defaultIndex, 0, Math.max(0, n - 1));
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(start);
  const raw = useMotionValue(start * STEP);
  const smooth = useSpring(raw, SCROLL_SPRING);
  const shown = useMotionValue(0);
  const heights = useRef(new Map<string, number>());
  const painters = useRef(new Map<string, (pose: Pose) => void>());
  const lastActive = useRef(start);
  const maxH = height - 2 * (PILL + GAP) - 28;

  const paint = (scrollTop: number) => {
    if (!n) return;
    const p = clamp(scrollTop / STEP, 0, n - 1);
    const hs = cards.map((c) => Math.min(maxH, heights.current.get(c.id) ?? ESTIMATE));
    posesAt(p, hs, height).forEach((pose, i) => painters.current.get(cards[i].id)?.(pose));
    const k = Math.round(p);
    if (k !== lastActive.current) {
      lastActive.current = k;
      setActive(k);
      onActiveChange?.(k, cards[k]);
    }
  };
  // Scroll and measurement callbacks outlive renders; they always reach the latest paint through this.
  const latest = useRef({ paint, still });
  useIsoLayoutEffect(() => {
    latest.current = { paint, still };
  });
  const repaint = useCallback(() => {
    const { paint, still } = latest.current;
    paint(still ? raw.get() : smooth.get());
  }, [raw, smooth]);

  useMotionValueEvent(smooth, "change", (v) => {
    if (!latest.current.still) latest.current.paint(v);
  });
  useMotionValueEvent(raw, "change", (v) => {
    if (latest.current.still) latest.current.paint(v);
  });

  const register = useCallback((id: string, fn: (pose: Pose) => void) => {
    painters.current.set(id, fn);
    return () => {
      painters.current.delete(id);
    };
  }, []);
  const onMeasure = useCallback(
    (id: string, h: number) => {
      if (heights.current.get(id) === h) return;
      heights.current.set(id, h);
      repaint();
    },
    [repaint],
  );

  // Settling is done here rather than with CSS scroll snap: snap picks the nearest card, so a single wheel notch
  // springs back. This goes on to the next card in the direction you scrolled, however small the nudge.
  const rest = useRef(start);
  const idle = useRef(0);
  const touching = useRef(false);
  useEffect(() => () => window.clearTimeout(idle.current), []);

  const goTo = useCallback(
    (i: number) => {
      const to = clamp(i, 0, n - 1);
      rest.current = to;
      scroller.current?.scrollTo({ top: to * STEP, behavior: latest.current.still ? "auto" : "smooth" });
    },
    [n],
  );
  const settle = () => {
    const el = scroller.current;
    if (!el || touching.current) return;
    const p = el.scrollTop / STEP;
    const r = rest.current;
    const to = p > r + NUDGE ? Math.max(r + 1, Math.round(p)) : p < r - NUDGE ? Math.min(r - 1, Math.round(p)) : r;
    if (Math.abs(el.scrollTop - clamp(to, 0, n - 1) * STEP) > 0.5) goTo(to);
    else rest.current = clamp(to, 0, n - 1);
  };
  const waitThenSettle = () => {
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(settle, SETTLE_MS);
  };

  // First client paint: go to the starting card with real heights, then fade the stack in. The server render
  // only knows estimates, so it stays invisible until here. If the window was scrolled before hydration, that
  // place is kept and settled instead of being thrown away.
  useIsoLayoutEffect(() => {
    const el = scroller.current;
    if (el && el.scrollTop === 0) el.scrollTop = start * STEP;
    const top = el?.scrollTop ?? start * STEP;
    raw.set(top);
    smooth.jump(top);
    repaint();
    if (top !== start * STEP) waitThenSettle();
    const fade = animate(shown, 1, { duration: 0.4 });
    return () => fade.stop();
  }, []);
  useEffect(repaint, [still, height, n, repaint]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    // From where the stack is headed, so pressing twice quickly moves two cards.
    const from = rest.current;
    const to =
      e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)
        ? from + 1
        : e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)
          ? from - 1
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : null;
    if (to === null) return;
    e.preventDefault();
    goTo(to);
  };

  if (!n) return null;
  const seeds = posesAt(start, cards.map(() => ESTIMATE), height);

  return (
    <div
      ref={scroller}
      role="region"
      aria-label={label}
      tabIndex={0}
      onScroll={(e) => {
        raw.set(e.currentTarget.scrollTop);
        waitThenSettle();
      }}
      // A finger resting on the window isn't a finished scroll; settle once it lifts.
      onTouchStart={() => {
        touching.current = true;
      }}
      onTouchEnd={() => {
        touching.current = false;
        waitThenSettle();
      }}
      onTouchCancel={() => {
        touching.current = false;
        waitThenSettle();
      }}
      onKeyDown={onKeyDown}
      style={{ height }}
      className={cn(
        "@container relative overflow-y-auto rounded-[28px] bg-(--fold-stage) outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-(--fold-ink)/20 [&::-webkit-scrollbar]:hidden",
        THEME,
        className,
      )}
    >
      <div className="sticky top-0 px-4" style={{ height }}>
        <motion.div style={{ opacity: shown }} className="@container relative mx-auto h-full max-w-[440px]">
          {cards.map((card, i) => (
            <Card
              key={card.id}
              card={card}
              index={i}
              open={i === active}
              hidden={Math.abs(i - active) > 2}
              seed={seeds[i]}
              still={still}
              register={register}
              onMeasure={onMeasure}
              goTo={goTo}
            />
          ))}
        </motion.div>

        <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 flex-col @[600px]:flex">
          {cards.map((card, i) => (
            <button
              key={card.id}
              type="button"
              aria-label={`Go to ${card.title}`}
              aria-current={i === active || undefined}
              onClick={() => goTo(i)}
              className="grid w-5 place-items-center py-[3px] outline-none focus-visible:ring-2 focus-visible:ring-(--fold-ink)/30"
            >
              <motion.span
                className="block w-1.5 rounded-full bg-(--fold-ink)"
                initial={false}
                animate={{ height: i === active ? 18 : 6, opacity: i === active ? 0.8 : 0.2 }}
                transition={still ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.2 }}
              />
            </button>
          ))}
        </div>

      </div>

      {/* The scroll track: STEP px of scrolling per card. */}
      <div aria-hidden style={{ height: (n - 1) * STEP }} />
    </div>
  );
}

export default FoldStack;
