"use client";

import { animate, motion, useMotionValue, useReducedMotionConfig, type Variants } from "motion/react";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/lib/utils";

export type PricingFeature = string | { text: string; included?: boolean };

export interface PricingPlan {
  id: string;
  /** Plan name on the card. */
  name: string;
  /** One line under the name. */
  description: string;
  /** "$19" */
  price?: string;
  /** "per month" */
  period?: string;
  /** What the open card lists. Pass `{ text, included: false }` to show something it leaves out. */
  features: PricingFeature[];
  /** Card colour. Pick a light one: the text on it is near-black. */
  accent?: string;
  /** Label of the action inside an open card. */
  ctaLabel?: string;
  /** When set, the action is a link. */
  href?: string;
}

export interface LiftPricingProps {
  /** One card per plan, left to right. */
  plans: PricingPlan[];
  /** Small label above the heading. */
  eyebrow?: string;
  /** Big line in the dark header. */
  heading?: string;
  /** Line under the heading. */
  description?: string;
  /** Plan that starts open. */
  defaultExpanded?: string | null;
  /** Called with the open plan's id, or `null` when all are closed. */
  onExpandedChange?: (id: string | null) => void;
  /** Fires when the action inside an open card is used. */
  onSelect?: (plan: PricingPlan) => void;
  className?: string;
}

const ACCENTS = ["#79bcff", "#cdadff", "#fabdf1", "#b9c6ff"];
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Critically damped: a lifted card has to stop flush with the panel edge, never above it. */
const LIFT = { type: "spring", duration: 0.7, bounce: 0 } as const;
/** How far a resting card rises toward the pointer. */
const NUDGE = 10;

/** Tailwind's `md`. Below it the cards stack and open like an accordion. */
const WIDE = "(min-width: 48rem)";
const subscribeWide = (notify: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", notify);
  return () => mq.removeEventListener("change", notify);
};
/** null on the server and during hydration, when the viewport isn't known yet. */
const useViewport = () => useSyncExternalStore<boolean | null>(subscribeWide, () => window.matchMedia(WIDE).matches, () => null);

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const LIST: Variants = {
  closed: { transition: { staggerChildren: 0.02, staggerDirection: -1 } },
  open: { transition: { delayChildren: 0.14, staggerChildren: 0.05 } },
};
const ITEM: Variants = {
  closed: { opacity: 0, y: 10, transition: { duration: 0.15 } },
  open: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
};
/** Reduced motion: the same reveal, as a plain fade with no travel and no stagger. */
const LIST_FLAT: Variants = { closed: {}, open: {} };
const ITEM_FADE: Variants = {
  closed: { opacity: 0, transition: { duration: 0.12 } },
  open: { opacity: 1, transition: { duration: 0.3 } },
};

type ResolvedPlan = PricingPlan & { accent: string };

interface PlanCardProps {
  plan: ResolvedPlan;
  uid: string;
  open: boolean;
  wide: boolean;
  /** How far the card is pushed below the panel edge while closed; null until measured. */
  rest: number | null;
  reduce: boolean;
  /** Set on one card so the panel can measure the shared list row. */
  measureRef?: (el: HTMLDivElement | null) => void;
  onToggle: () => void;
  onSelect?: (plan: PricingPlan) => void;
}

const ctaClass =
  "mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-neutral-50 transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 active:translate-y-px md:min-h-10";

function PlanCard({ plan, uid, open, wide, rest, reduce, measureRef, onToggle, onSelect }: PlanCardProps) {
  const nameId = `${uid}-${plan.id}-name`;
  const toggleId = `${uid}-${plan.id}-toggle`;
  const listId = `${uid}-${plan.id}-list`;

  // The lift is a transform and nothing else, so nothing around the card reflows.
  const y = useMotionValue(0);
  const opacity = useMotionValue(1);
  const placed = useRef<number | null>(null);
  const [hovered, setHovered] = useState(false);

  useIsoLayoutEffect(() => {
    if (!wide || rest === null) {
      placed.current = null;
      y.jump(0);
      return;
    }
    const target = open ? 0 : rest - (hovered && !reduce ? NUDGE : 0);
    const from = placed.current;
    placed.current = target;
    // The first placement is instant so a card never visibly slides into its resting spot.
    if (from === null) {
      y.jump(target);
      return;
    }
    if (reduce) {
      // No travel: swap position and fade the card back in so the change still reads as smooth.
      y.jump(target);
      if (from !== target) {
        opacity.set(0.35);
        animate(opacity, 1, { duration: 0.3 });
      }
      return;
    }
    animate(y, target, LIFT);
  }, [wide, rest, open, hovered, reduce, y, opacity]);
  useEffect(
    () => () => {
      y.stop();
      opacity.stop();
    },
    [y, opacity],
  );

  const item = reduce ? ITEM_FADE : ITEM;

  // The whole card opens and closes it. The toggle button stays the keyboard and screen-reader
  // control (its click bubbles up to here), and the action inside an open card keeps its own meaning.
  const onCardClick = (e: MouseEvent<HTMLElement>) => {
    const control = (e.target as Element).closest("a, button");
    if (control && !control.hasAttribute("aria-expanded")) return;
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) return; // dragging to select text isn't a click
    onToggle();
  };

  return (
    <motion.article
      aria-labelledby={nameId}
      onClick={onCardClick}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ y, opacity, backgroundColor: plan.accent }}
      className="flex cursor-pointer flex-col overflow-clip rounded-[22px] text-neutral-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.45)] md:row-span-2 md:grid md:grid-rows-subgrid md:rounded-b-none md:rounded-t-[26px]"
    >
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <h3 id={nameId} className="text-3xl font-semibold tracking-[-0.04em]">
          {plan.name}
        </h3>
        {plan.price ? (
          <p className="flex items-baseline gap-1.5">
            <span className="text-xl font-medium tabular-nums">{plan.price}</span>
            {plan.period ? <span className="text-sm text-neutral-950/60">{plan.period}</span> : null}
          </p>
        ) : null}
        <p className="max-w-[26ch] text-pretty text-[15px] leading-snug text-neutral-950/70">{plan.description}</p>
        <button
          id={toggleId}
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${open ? "Close" : "Show details for"} ${plan.name}`}
          className="mt-auto inline-flex min-h-11 w-fit items-center rounded-full border border-neutral-950/30 px-4 text-xs font-semibold uppercase tracking-[0.12em] transition-colors hover:bg-neutral-950/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 active:translate-y-px md:min-h-9"
        >
          {/* Both labels share one cell so the button never changes width. */}
          <span className="grid">
            <span className={cn("col-start-1 row-start-1 transition-opacity duration-200", open && "opacity-0")}>Details</span>
            <span className={cn("col-start-1 row-start-1 opacity-0 transition-opacity duration-200", open && "opacity-100")}>
              Close
            </span>
          </span>
        </button>
      </div>

      {/* Stacked: this row grows from 0 to its content. From md up it is always open and sits below the panel edge until the card lifts. */}
      <div
        ref={measureRef}
        data-open={open}
        inert={!open}
        className={cn(
          "grid grid-rows-[1fr] max-md:data-[open=false]:grid-rows-[0fr]",
          !reduce && "transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
      >
        <div className="min-h-0 overflow-clip">
          <motion.ul
            id={listId}
            aria-label={`${plan.name} includes`}
            initial={false}
            animate={open ? "open" : "closed"}
            variants={reduce ? LIST_FLAT : LIST}
            className="space-y-2.5 px-5 pb-6 pt-1 text-[15px] leading-snug text-neutral-950/80 sm:px-6"
          >
            {plan.features.map((feature, i) => {
              const { text, included = true } = typeof feature === "string" ? { text: feature } : feature;
              return (
                <motion.li
                  key={`${text}-${i}`}
                  variants={item}
                  className={cn("flex items-start gap-2.5", !included && "text-neutral-950/45 line-through decoration-neutral-950/30")}
                >
                  <span aria-hidden className={cn("mt-2 size-1.5 shrink-0 rounded-full bg-neutral-950/70", !included && "bg-neutral-950/25")} />
                  <span>
                    {text}
                    {!included ? <span className="sr-only"> (not included)</span> : null}
                  </span>
                </motion.li>
              );
            })}
            <motion.li variants={item} className="list-none">
              {plan.href ? (
                <a href={plan.href} onClick={() => onSelect?.(plan)} className={ctaClass}>
                  {plan.ctaLabel ?? "Get started"}
                </a>
              ) : (
                <button type="button" onClick={() => onSelect?.(plan)} className={ctaClass}>
                  {plan.ctaLabel ?? "Get started"}
                </button>
              )}
            </motion.li>
          </motion.ul>
        </div>
      </div>
    </motion.article>
  );
}

export function LiftPricing({
  plans,
  eyebrow,
  heading,
  description,
  defaultExpanded = null,
  onExpandedChange,
  onSelect,
  className,
}: LiftPricingProps) {
  // Follows <MotionConfig reducedMotion>: animates by default, like Motion itself. Wrap your app in
  // <MotionConfig reducedMotion="user"> to honour the system setting (fades instead of the lift).
  const reduce = useReducedMotionConfig() ?? false;
  const viewport = useViewport();
  const wide = viewport === true;
  const uid = useId();
  const [open, setOpen] = useState<string | null>(() => (plans.some((p) => p.id === defaultExpanded) ? defaultExpanded : null));
  const [measureEl, setMeasureEl] = useState<HTMLDivElement | null>(null);
  const [rest, setRest] = useState<number | null>(null);

  // Cards share one height, so any card's list row is how far a closed card hides below the edge.
  useIsoLayoutEffect(() => {
    if (!wide || !measureEl) return;
    const read = () => setRest(measureEl.getBoundingClientRect().height);
    read();
    const observer = new ResizeObserver(read);
    observer.observe(measureEl);
    return () => observer.disconnect();
  }, [wide, measureEl]);

  const resolved: ResolvedPlan[] = plans.map((plan, i) => ({ ...plan, accent: plan.accent ?? ACCENTS[i % ACCENTS.length] }));
  const ready = viewport !== null && (!wide || rest !== null);

  const change = (next: string | null) => {
    setOpen(next);
    onExpandedChange?.(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== "Escape" || !open) return;
    const toggle = document.getElementById(`${uid}-${open}-toggle`);
    change(null);
    toggle?.focus();
  };

  if (!plans.length) return null;

  const headingId = `${uid}-heading`;

  return (
    <section
      aria-labelledby={heading ? headingId : undefined}
      aria-label={heading ? undefined : "Pricing"}
      onKeyDown={onKeyDown}
      className={cn("relative isolate overflow-clip rounded-[28px] bg-neutral-950 text-neutral-50", className)}
    >
      {eyebrow || heading || description ? (
        <header className="grid gap-6 px-5 pt-6 sm:px-8 sm:pt-8 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-8">
          <div>
            {eyebrow ? (
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.12em] text-neutral-300">
                {eyebrow}
              </span>
            ) : null}
          </div>
          <div className="max-w-2xl space-y-4">
            {heading ? (
              <h2 id={headingId} className="text-balance text-3xl font-semibold leading-none tracking-[-0.045em] sm:text-4xl md:text-5xl">
                {heading}
              </h2>
            ) : null}
            {description ? <p className="text-pretty text-base leading-relaxed text-neutral-400">{description}</p> : null}
          </div>
        </header>
      ) : null}

      {/* The panel never changes size: the cards only move inside it. From md up it stays hidden until the cards are measured (server HTML included), so closed cards never flash open. */}
      <div
        data-ready={ready}
        style={{ "--lp-cols": plans.length } as CSSProperties}
        className="flex flex-col gap-3 px-4 pb-4 pt-8 sm:px-6 sm:pb-6 md:grid md:grid-cols-[repeat(var(--lp-cols),minmax(0,1fr))] md:grid-rows-[auto_auto] md:gap-x-2 md:gap-y-0 md:p-0 md:px-8 md:pt-10 md:data-[ready=false]:invisible"
      >
        {resolved.map((plan, i) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            uid={uid}
            open={open === plan.id}
            wide={wide}
            rest={rest}
            reduce={reduce}
            measureRef={i === 0 ? setMeasureEl : undefined}
            onToggle={() => change(open === plan.id ? null : plan.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

export default LiftPricing;
