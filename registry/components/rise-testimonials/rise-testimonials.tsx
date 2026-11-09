"use client";

import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotionConfig,
  useTransform,
  type AnimationPlaybackControls,
  type PanInfo,
  type Variants,
} from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
  type Ref,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

export interface Testimonial {
  id: string;
  /** Who said it. */
  name: string;
  /** Their job and company, on the line under the name. */
  role: string;
  /** What a closed card leads with. Four lines at most; shorter is better. */
  headline: string;
  /** The full story, shown when the card opens. */
  quote: string;
  /** A number to hang the story on: { value: "3 days", label: "to get paid" }. */
  metric?: { value: string; label: string };
  /** Portrait URL. Initials stand in when it's missing. */
  avatar?: string;
  /** Any CSS colour for the card. Leave it out and the card takes the next tone from the built-in set. */
  tone?: string;
}

export interface RiseTestimonialsProps {
  /** One card each, in order. */
  testimonials: Testimonial[];
  /** Heading above the row. */
  heading?: string;
  /** Line under the heading. */
  description?: string;
  /** Id of the card that starts open. */
  defaultOpen?: string | null;
  /** Called with the open card's id, or `null` when it closes. */
  onOpenChange?: (id: string | null) => void;
  className?: string;
}

/**
 * The built-in tones share one lightness and one chroma and only change hue, so they read as a single set
 * and sit quietly next to anything. Dark mode gets the same hues, deep instead of light.
 */
const HUES = [85, 155, 300, 50, 245, 350];
const toneVars = (tone: string | undefined, i: number): CSSProperties => {
  const hue = HUES[i % HUES.length];
  return {
    "--tone": tone ?? `oklch(0.93 0.042 ${hue})`,
    "--tone-dark": tone ? `color-mix(in oklab, ${tone} 30%, #0a0a0a)` : `oklch(0.31 0.055 ${hue})`,
  } as CSSProperties;
};

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Height of the white strip that always shows: the name, the role and the toggle. */
const STRIP = 68;
/** Colour left showing around the white panel. */
const INSET = 6;
/** Colour kept above an open panel, enough for the avatar. */
const LEAD = 76;
/** The space between two cards: the slot's right padding (pr-4). */
const GAP = 16;
/** Critically damped: the panel has to stop flush with the card edge, never past it. */
const RISE = { type: "spring", duration: 0.6, bounce: 0 } as const;
const GLIDE = { type: "spring", duration: 0.75, bounce: 0 } as const;

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

const LIST: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const ITEM: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};
/** Reduced motion: same end state, no travel and no stagger. */
const ITEM_NOW: Variants = { hidden: ITEM.hidden, show: { opacity: 1, y: 0, transition: { duration: 0 } } };

/** The part of the white panel that is only there when open, under the strip. Rendered twice: live, and invisible to size the card. */
function Story({ item, ref }: { item: Testimonial; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className="px-5 pb-5 pt-1">
      <blockquote className="text-pretty text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
        &ldquo;{item.quote}&rdquo;
      </blockquote>
      {item.metric ? (
        <p className="mt-4 flex items-baseline gap-2">
          <span className="text-xl font-semibold tabular-nums tracking-tight text-neutral-950 dark:text-neutral-50">{item.metric.value}</span>
          <span className="text-[13px] text-neutral-600 dark:text-neutral-400">{item.metric.label}</span>
        </p>
      ) : null}
    </div>
  );
}

interface CardProps {
  item: Testimonial;
  index: number;
  uid: string;
  open: boolean;
  /** Another card is open, so this one steps back. */
  dim: boolean;
  reduce: boolean;
  /** True while a drag is settling, so the click that ends it doesn't open a card. */
  dragged: RefObject<boolean>;
  onToggle: () => void;
  onFocusIn: () => void;
}

function Card({ item, index, uid, open, dim, reduce, dragged, onToggle, onFocusIn }: CardProps) {
  const nameId = `${uid}-${item.id}-name`;
  const bodyId = `${uid}-${item.id}-body`;

  // The white panel is the strip (name, role, toggle) with the story under it. It rests with only the strip
  // showing and rises to cover the lower part of the card.
  // It is a transform and nothing else, so no size changes and nothing around the card moves. The
  // percentage is the panel's own height, so the closed position is right on the server too.
  const progress = useMotionValue(open ? 1 : 0);
  const fade = useMotionValue(open ? 1 : 0);
  const rest = useTransform(progress, (p) => 1 - p);
  const sheet = useMotionTemplate`translateY(calc((100% - ${STRIP}px) * ${rest}))`;
  const headlineOpacity = useTransform(progress, [0, 0.35], [1, 0]);
  const headlineY = useTransform(progress, [0, 1], [0, -14]);
  const drift = useTransform(fade, [0, 1], [10, 0]);

  useEffect(() => {
    const target = open ? 1 : 0;
    if (progress.get() === target) return;
    if (reduce) {
      // No travel: swap the position and fade the story in, so the change still reads as smooth.
      progress.jump(target);
      fade.set(0);
      const pulse = animate(fade, target, { duration: 0.25 });
      return () => pulse.stop();
    }
    const controls = [
      animate(progress, target, RISE),
      animate(fade, target, open ? { duration: 0.4, delay: 0.12, ease: EASE } : { duration: 0.15 }),
    ];
    return () => controls.forEach((c) => c.stop());
  }, [open, reduce, progress, fade]);

  // The whole card opens and closes it. The toggle stays the keyboard and screen-reader control
  // (its click bubbles up to here).
  const onCardClick = (e: MouseEvent<HTMLElement>) => {
    if (dragged.current) return;
    const control = (e.target as Element).closest("a, button");
    if (control && !control.hasAttribute("aria-expanded")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // dragging to select text isn't a click
    onToggle();
  };

  return (
    <motion.li
      variants={reduce ? ITEM_NOW : ITEM}
      onFocus={(e) => e.target.matches(":focus-visible") && onFocusIn()}
      className="flex w-[84%] shrink-0 cursor-grab pr-4 active:cursor-grabbing sm:w-[46%] lg:w-[31.5%]"
    >
      <article
        aria-labelledby={nameId}
        onClick={onCardClick}
        style={toneVars(item.tone, index)}
        className={cn(
          "relative w-full transition-[transform,opacity] duration-300",
          !reduce && "hover:-translate-y-0.5",
          dim && "opacity-70 hover:opacity-100",
        )}
      >
        <div className="absolute inset-0 overflow-clip rounded-[26px] bg-(--tone) ring-1 ring-inset ring-black/[0.06] dark:bg-(--tone-dark) dark:ring-white/10">
          <div className="absolute inset-0 flex flex-col justify-between p-5" style={{ paddingBottom: INSET + STRIP + 20 }}>
            <span
              aria-hidden
              className="grid size-10 place-items-center overflow-clip rounded-full bg-white/70 text-[13px] font-medium text-neutral-900 ring-1 ring-black/[0.06] dark:bg-white/10 dark:text-neutral-50 dark:ring-white/10"
            >
              {item.avatar ? (
                <img src={item.avatar} alt="" width={40} height={40} loading="lazy" decoding="async" className="size-full object-cover" />
              ) : (
                initials(item.name)
              )}
            </span>
            <motion.p
              style={{ opacity: headlineOpacity, y: headlineY }}
              className="line-clamp-4 select-none text-balance text-[26px] font-medium leading-[1.12] tracking-[-0.035em] text-neutral-950 dark:text-neutral-50"
            >
              {item.headline}
            </motion.p>
          </div>

          <motion.div
            style={{ transform: sheet }}
            className="absolute inset-x-1.5 bottom-1.5 rounded-[20px] bg-white shadow-[0_1px_2px_rgb(17_17_17/0.06)] will-change-transform dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between gap-3 px-5" style={{ height: STRIP }}>
              <div className="min-w-0">
                <p id={nameId} className="truncate text-[15px] font-medium leading-tight tracking-[-0.01em] text-neutral-950 dark:text-neutral-50">
                  {item.name}
                </p>
                <p className="mt-0.5 truncate text-[13px] text-neutral-600 dark:text-neutral-400">{item.role}</p>
              </div>
              <button
                id={`${uid}-${item.id}-toggle`}
                type="button"
                aria-expanded={open}
                aria-controls={bodyId}
                aria-label={`${open ? "Close" : "Read"} ${item.name}'s story`}
                className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-neutral-950 text-white transition-colors duration-200 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200 dark:focus-visible:outline-white"
              >
                <motion.span
                  className="block"
                  initial={false}
                  animate={{ rotate: open ? 45 : 0 }}
                  transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.45, bounce: 0.3 }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </motion.span>
              </button>
            </div>
            <motion.div id={bodyId} inert={!open} style={{ opacity: fade, y: drift }}>
              <Story item={item} />
            </motion.div>
          </motion.div>
        </div>

        {/* An invisible copy of the open card, in the flow, so every card is as tall as the tallest story needs. */}
        <div aria-hidden className="invisible select-none">
          <div style={{ height: LEAD }} />
          <div className="mx-1.5 mb-1.5">
            <div style={{ height: STRIP }} />
            <Story item={item} />
          </div>
        </div>
      </article>
    </motion.li>
  );
}

const arrowClass =
  "grid size-11 place-items-center rounded-full border border-neutral-950/10 bg-white text-neutral-950 transition-[background-color,opacity,transform] duration-200 hover:bg-neutral-100 active:scale-95 disabled:pointer-events-none disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:focus-visible:outline-white";

type Edge = "start" | "mid" | "end" | "none" | "unknown";

export function RiseTestimonials({
  testimonials,
  heading,
  description,
  defaultOpen = null,
  onOpenChange,
  className,
}: RiseTestimonialsProps) {
  // Follows <MotionConfig reducedMotion>: animates by default, like Motion itself. Wrap your app in
  // <MotionConfig reducedMotion="user"> to honour the system setting (no travel, a soft fade instead).
  const reduce = useReducedMotionConfig() ?? false;
  const uid = useId();
  const count = testimonials.length;
  const [open, setOpen] = useState<string | null>(() => (testimonials.some((t) => t.id === defaultOpen) ? defaultOpen : null));
  const [limit, setLimit] = useState(0);
  const [edge, setEdge] = useState<Edge>("unknown");

  const x = useMotionValue(0);
  const maxX = useMotionValue(0);
  const trackOpacity = useMotionValue(1);
  const trackRef = useRef<HTMLUListElement>(null);
  const geo = useRef({ lefts: [] as number[], rights: [] as number[], width: 0, max: 0 });
  const glide = useRef<AnimationPlaybackControls | null>(null);
  const dragged = useRef(false);

  // Soft edges that only appear on a side that has more to show.
  const fadeLeft = useTransform(x, (v) => clamp(-v, 0, 28));
  const fadeRight = useTransform([x, maxX], ([xv, max]: number[]) => clamp(max + xv, 0, 28));
  const mask = useMotionTemplate`linear-gradient(90deg, transparent 0px, #000 ${fadeLeft}px, #000 calc(100% - ${fadeRight}px), transparent 100%)`;

  // Positions come from this cache, never from the DOM, so reading them every frame costs no layout.
  const sync = useCallback(() => {
    const { lefts, max } = geo.current;
    if (!lefts.length) return;
    const at = -x.get();
    setEdge(max <= 1 ? "none" : at <= 2 ? "start" : at >= max - 2 ? "end" : "mid");
  }, [x]);
  useMotionValueEvent(x, "change", sync);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    const width = track.clientWidth;
    const lefts = items.map((el) => el.offsetLeft);
    const rights = items.map((el) => el.offsetLeft + el.offsetWidth - GAP);
    const end = rights.length ? rights[rights.length - 1] : 0;
    const max = Math.max(0, end - width);
    geo.current = { lefts, rights, width, max };
    maxX.set(max);
    setLimit(max);
    if (-x.get() > max) x.set(-max);
    sync();
  }, [x, maxX, sync]);

  useIsoLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [measure, count]);

  useEffect(
    () => () => {
      glide.current?.stop();
    },
    [],
  );

  const glideTo = useCallback(
    (offset: number) => {
      const to = -clamp(offset, 0, geo.current.max);
      glide.current?.stop();
      if (reduce) {
        // No sliding: swap position and fade the row back in.
        x.set(to);
        trackOpacity.set(0.3);
        glide.current = animate(trackOpacity, 1, { duration: 0.3 });
        return;
      }
      glide.current = animate(x, to, GLIDE);
    },
    [reduce, x, trackOpacity],
  );

  const step = (dir: 1 | -1) => {
    const { lefts, max } = geo.current;
    const at = -x.get();
    glideTo(dir === 1 ? (lefts.find((l) => l > at + 4) ?? max) : ([...lefts].reverse().find((l) => l < at - 4) ?? 0));
  };

  /** Slide just far enough that card i is fully in view. */
  const reveal = (i: number) => {
    const { lefts, rights, width } = geo.current;
    const at = -x.get();
    if (lefts[i] < at - 1) glideTo(lefts[i]);
    else if (rights[i] > at + width + 1) glideTo(rights[i] - width);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setTimeout(() => {
      dragged.current = false;
    }, 0);
    const { lefts, max } = geo.current;
    const projected = clamp(-x.get() - info.velocity.x * 0.2, 0, max);
    let best = 0;
    let gap = Infinity;
    for (const left of lefts) {
      const d = Math.abs(Math.min(left, max) - projected);
      if (d < gap) {
        gap = d;
        best = left;
      }
    }
    glideTo(best);
  };

  const change = (next: string | null) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape" && open) {
      const toggle = document.getElementById(`${uid}-${open}-toggle`);
      change(null);
      toggle?.focus();
    } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && edge !== "none" && edge !== "unknown") {
      e.preventDefault();
      step(e.key === "ArrowRight" ? 1 : -1);
    }
  };

  if (!count) return null;

  const headingId = `${uid}-heading`;
  const hasHeader = Boolean(heading || description);
  const controls = edge !== "none" && edge !== "unknown";

  return (
    <section
      aria-roledescription="carousel"
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : "Testimonials"}
      onKeyDown={onKeyDown}
      className={cn("relative", className)}
    >
      <header className={cn("flex items-end gap-6", hasHeader ? "justify-between" : "justify-end")}>
        {hasHeader ? (
          <div className="max-w-xl space-y-3">
            {heading ? (
              <h2 id={headingId} className="text-balance text-3xl font-semibold leading-none tracking-[-0.045em] text-neutral-950 sm:text-4xl dark:text-neutral-50">
                {heading}
              </h2>
            ) : null}
            {description ? <p className="text-pretty text-base leading-relaxed text-neutral-600 dark:text-neutral-400">{description}</p> : null}
          </div>
        ) : null}
        <div role="group" aria-label="Carousel controls" className={cn("flex shrink-0 gap-2 transition-opacity duration-500", !controls && "pointer-events-none opacity-0")}>
          <button type="button" aria-label="Previous testimonials" disabled={edge === "start"} onClick={() => step(-1)} className={arrowClass}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M13 8H3m0 0 4-4M3 8l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button type="button" aria-label="Next testimonials" disabled={edge === "end"} onClick={() => step(1)} className={arrowClass}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 8h10m0 0-4-4m4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      {/* The row is clipped (not hidden), so focus or scrollIntoView can never scroll it out from under the transform. */}
      <motion.div
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="relative -mx-2 mt-5 overflow-clip px-2 pb-4 pt-1"
      >
        <motion.ul
          ref={trackRef}
          drag={limit > 0 ? "x" : false}
          dragConstraints={{ left: -limit, right: 0 }}
          dragElastic={0.12}
          dragMomentum={false}
          onDragStart={() => {
            dragged.current = true;
          }}
          onDragEnd={onDragEnd}
          variants={LIST}
          initial="hidden"
          animate={reduce ? "show" : undefined}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          style={{ x, opacity: trackOpacity }}
          className="relative flex items-stretch"
        >
          {testimonials.map((item, i) => (
            <Card
              key={item.id}
              item={item}
              index={i}
              uid={uid}
              open={open === item.id}
              dim={open !== null && open !== item.id}
              reduce={reduce}
              dragged={dragged}
              onToggle={() => {
                const next = open === item.id ? null : item.id;
                change(next);
                if (next) reveal(i);
              }}
              onFocusIn={() => reveal(i)}
            />
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}

export default RiseTestimonials;
