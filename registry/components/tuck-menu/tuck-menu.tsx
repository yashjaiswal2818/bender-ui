"use client";

import { animate, motion, useMotionValue, useReducedMotionConfig, useTransform } from "motion/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
const OPEN = { duration: 0.8, ease: EASE_OUT };
const CLOSE = { duration: 0.6, ease: [0.65, 0, 0.35, 1] as [number, number, number, number], delay: 0.06 };
const RADIUS = 18;
const LETTER_MS = 18;

const subscribe = () => () => {};
/** Reduced motion, but only once hydrated, so the first client render matches the server's. */
function useStill() {
  const reduce = useReducedMotionConfig();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated && reduce === true;
}

interface TuckMenuState {
  open: boolean;
  /** The current link. */
  active: number;
  /** The link being pointed at or focused while the menu is open, otherwise the current one. */
  peek: number;
}

const TuckMenuContext = createContext<TuckMenuState>({ open: false, active: 0, peek: 0 });

/** For the page inside a TuckMenu: lets it preview whichever link is being pointed at. */
export function useTuckMenu() {
  return useContext(TuckMenuContext);
}

export interface TuckMenuLink {
  /** Text of the link. */
  label: string;
  /** Where it goes. Without one, the link only calls `onNavigate`. */
  href?: string;
  /** A small note at the end of the row, like a count or a "New" tag. */
  meta?: ReactNode;
}

export interface TuckMenuProps {
  /** The menu, in order. They're numbered for you. */
  links: TuckMenuLink[];
  /** Top left of the page. */
  brand?: ReactNode;
  /** Pinned to the bottom of the menu. */
  footer?: ReactNode;
  /** The page. Read `useTuckMenu()` inside it to preview the link being pointed at. */
  children?: ReactNode;
  /** Index of the current page. */
  defaultActive?: number;
  /** Called when a link is picked, before the menu closes. */
  onNavigate?: (link: TuckMenuLink, index: number) => void;
  /** Controls the menu. Pair with `onOpenChange`. */
  open?: boolean;
  /** Starts open when uncontrolled. */
  defaultOpen?: boolean;
  /** Called when the menu opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Accessible name of the menu. */
  label?: string;
  className?: string;
  /** Extra classes for the Menu / Close button, for example to restyle it once the page scrolls. */
  toggleClassName?: string;
}

/** A word whose letters lift and take the accent one after another on hover. */
function Word({ text, still }: { text: string; still: boolean }) {
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex">
        {Array.from(text).map((ch, i) => (
          <span
            key={i}
            style={{ transitionDelay: `${i * LETTER_MS}ms` }}
            className={cn(
              "inline-block whitespace-pre transition-[translate,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              "group-hover:text-(--tm-accent) group-focus-visible:text-(--tm-accent)",
              !still && "group-hover:-translate-y-[0.09em] group-focus-visible:-translate-y-[0.09em]",
            )}
          >
            {ch}
          </span>
        ))}
      </span>
    </>
  );
}

/** Two lines that cross into an X. */
function Burger({ open }: { open: boolean }) {
  const line = "absolute inset-x-0 top-1/2 -mt-[0.75px] h-[1.5px] rounded-full bg-current";
  return (
    <span aria-hidden className="relative block h-[0.75em] w-[1.05em]">
      <motion.span initial={false} animate={{ y: open ? 0 : -3.5, rotate: open ? 45 : 0 }} transition={OPEN} className={line} />
      <motion.span initial={false} animate={{ y: open ? 0 : 3.5, rotate: open ? -45 : 0 }} transition={OPEN} className={line} />
    </span>
  );
}

export function TuckMenu({
  links,
  brand,
  footer,
  children,
  defaultActive = 0,
  onNavigate,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  label = "Menu",
  className,
  toggleClassName,
}: TuckMenuProps) {
  const still = useStill();
  const id = useId();
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const [active, setActive] = useState(defaultActive);
  const [pointed, setPointed] = useState<number | null>(null);
  const peek = open && pointed !== null ? pointed : active;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!next) setPointed(null);
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );

  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const activeLink = useRef<HTMLAnchorElement>(null);

  // p runs 0 → 1 as the page tucks into a card beside the menu.
  const p = useMotionValue(0);
  const panelW = useMotionValue(0);
  const margin = useMotionValue(10);
  const clip = useTransform([p, panelW, margin], ([v, w, m]: number[]) => {
    const e = v * m;
    return `inset(${e}px ${v * w}px ${e}px ${e}px round ${v * RADIUS}px)`;
  });

  useIsoLayoutEffect(() => {
    const el = panel.current;
    const box = root.current;
    if (!el || !box) return;
    const fit = () => {
      panelW.set(el.offsetWidth);
      margin.set(clamp(box.offsetWidth * 0.012, 8, 14));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    ro.observe(box);
    return () => ro.disconnect();
  }, [panelW, margin]);

  const settled = useRef(false);
  useIsoLayoutEffect(() => {
    const to = open ? 1 : 0;
    if (!settled.current || still) {
      settled.current = true;
      p.set(to);
      return;
    }
    const run = animate(p, to, open ? OPEN : CLOSE);
    return () => run.stop();
  }, [open, still, p]);

  // Focus follows the menu: into the current link on open, back to the toggle on close.
  const was = useRef(open);
  useEffect(() => {
    if (was.current === open) return;
    was.current = open;
    (open ? activeLink.current : toggle.current)?.focus({ preventScroll: true });
  }, [open]);

  const pick = (e: MouseEvent, link: TuckMenuLink, i: number) => {
    if (!link.href) e.preventDefault();
    setActive(i);
    onNavigate?.(link, i);
    setOpen(false);
  };

  const leaveList = (e: FocusEvent<HTMLUListElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPointed(null);
  };

  const enter = (i: number) => (open ? { duration: 0.55, delay: 0.2 + i * 0.05, ease: EASE_OUT } : { duration: 0.15 });

  return (
    <TuckMenuContext.Provider value={{ open, active, peek }}>
      <div
        ref={root}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) setOpen(false);
        }}
        style={{ "--tm-w": "min(86%, max(19rem, 33%))" } as CSSProperties}
        className={cn(
          "relative isolate h-dvh overflow-clip bg-(--tm-under) [container-type:size]",
          "[--tm-accent:#fabdf1] [--tm-ink:#111111] [--tm-paper:#f7f5f1] [--tm-under:#121212]",
          className,
        )}
      >
        {/* The menu waits underneath, on the right. */}
        <nav
          ref={panel}
          id={id}
          aria-label={label}
          inert={!open}
          className="absolute inset-y-0 right-0 flex w-(--tm-w) flex-col overflow-y-auto pt-[clamp(68px,17cqh,116px)] pr-[clamp(16px,2.4cqw,34px)] pb-[clamp(16px,3.4cqh,28px)] pl-[clamp(20px,2.8cqw,40px)] text-(--tm-paper) [scrollbar-width:none]"
        >
          <ul
            onPointerLeave={() => setPointed(null)}
            onBlur={leaveList}
            className="flex flex-col gap-[0.1em] text-[clamp(22px,min(3.4cqw,6.6cqh),52px)] leading-[1.14] font-semibold tracking-[-0.045em]"
          >
            {links.map((link, i) => {
              const on = i === active;
              return (
                <motion.li
                  key={link.label}
                  initial={false}
                  animate={{ opacity: open ? 1 : 0, x: open || still ? 0 : 18 }}
                  transition={enter(i)}
                >
                  <a
                    ref={on ? activeLink : undefined}
                    href={link.href ?? "#"}
                    aria-current={on ? "page" : undefined}
                    onClick={(e) => pick(e, link, i)}
                    onPointerEnter={() => setPointed(i)}
                    onFocus={() => setPointed(i)}
                    className={cn(
                      "group flex items-center gap-[0.45em] rounded-lg outline-none focus-visible:bg-white/[0.06]",
                      on ? "text-(--tm-paper)" : "text-(--tm-paper)/45",
                    )}
                  >
                    <span
                      className={cn(
                        "w-[2em] shrink-0 font-mono text-[0.26em] font-normal tracking-normal tabular-nums transition-colors duration-300 group-hover:text-(--tm-accent)",
                        on ? "text-white/70" : "text-white/30",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Word text={link.label} still={still} />
                    {link.meta != null && (
                      <span className="ml-auto shrink-0 text-[0.3em] font-normal tracking-normal text-white/45">
                        {link.meta}
                      </span>
                    )}
                  </a>
                </motion.li>
              );
            })}
          </ul>

          {footer != null && (
            <motion.div
              initial={false}
              animate={{ opacity: open ? 1 : 0, x: open || still ? 0 : 18 }}
              transition={enter(links.length)}
              className="mt-auto shrink-0 pt-[clamp(20px,5cqh,40px)]"
            >
              {footer}
            </motion.div>
          )}
        </nav>

        {/* The page. Opening tucks it into a rounded card in the space the menu leaves. */}
        <motion.div inert={open} style={{ clipPath: clip }} className="absolute inset-0 z-10 overflow-clip bg-neutral-900">
          {children}
          {brand != null && (
            <div className="absolute top-[clamp(14px,3.2cqh,22px)] left-[clamp(18px,2.8cqw,40px)] flex h-9 items-center text-[clamp(14px,1.25cqw,17px)] text-white">
              {brand}
            </div>
          )}
        </motion.div>

        {/* Clicking the card closes the menu. */}
        {open && (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            onClick={() => setOpen(false)}
            className="absolute inset-y-0 left-0 right-(--tm-w) z-20 cursor-default"
          />
        )}

        <button
          ref={toggle}
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen(!open)}
          className={cn(
            "absolute top-[clamp(14px,3.2cqh,22px)] right-[clamp(14px,2.2cqw,32px)] z-30 flex h-9 items-center gap-[0.6em] rounded-full pr-[0.9em] pl-[1.05em] text-[13.5px] font-medium outline-none",
            "transition-[background-color,color,box-shadow] duration-300 focus-visible:ring-2 focus-visible:ring-(--tm-accent)",
            open
              ? "bg-(--tm-paper) text-(--tm-ink)"
              : "bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md ring-inset hover:bg-white/25",
            toggleClassName,
          )}
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          <span aria-hidden className="grid">
            <motion.span
              initial={false}
              animate={{ opacity: open ? 0 : 1, y: open ? -6 : 0 }}
              transition={{ duration: 0.25 }}
              className="[grid-area:1/1]"
            >
              Menu
            </motion.span>
            <motion.span
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : 6 }}
              transition={{ duration: 0.25 }}
              className="[grid-area:1/1]"
            >
              Close
            </motion.span>
          </span>
          <Burger open={open} />
        </button>
      </div>
    </TuckMenuContext.Provider>
  );
}

export default TuckMenu;
