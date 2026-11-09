"use client";

import { AnimatePresence, motion, useReducedMotionConfig } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** The surface reshapes on a soft spring: quick to answer, no wobble at the edges. */
const MORPH = { type: "spring", duration: 0.5, bounce: 0.12 } as const;
const SLIDE = { duration: 0.42, ease: [0.22, 1, 0.36, 1] } as const;
const CLOSE_DELAY = 140;
const GLASS = "rgba(255, 255, 255, 0.86)";

const subscribe = () => () => {};
/** Reduced motion, but only once hydrated, so the first client render matches the server's. */
function useStill() {
  const reduce = useReducedMotionConfig();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated && reduce === true;
}

export interface BloomMenuItem {
  id: string;
  /** The word in the bar. */
  label: string;
  /** What the bar grows into on wide screens. */
  content: ReactNode;
  /** Width of that panel, in px. */
  width: number;
  /** A short version for the phone menu. Falls back to `content`. */
  compact?: ReactNode;
  /** The surface takes this colour while the item is open. */
  tint?: string;
}

export interface BloomMenuProps {
  /** One per entry in the bar, in order. */
  items: BloomMenuItem[];
  /** Left end of the bar, like a logo or wordmark. */
  brand?: ReactNode;
  /** Right end of the bar, like a call to action. */
  action?: ReactNode;
  /** Accessible name of the `nav`. */
  label?: string;
  className?: string;
}

/** Reports its height whenever it changes, so the surface can grow to fit. */
function Fit({ id, onHeight, children }: { id: string; onHeight: (id: string, h: number) => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    onHeight(id, el.offsetHeight);
    const ro = new ResizeObserver(() => onHeight(id, el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, onHeight]);
  return <div ref={ref}>{children}</div>;
}

/**
 * A navigation bar that grows into its own dropdown. Point at an item and the same surface stretches and reshapes to
 * hold that item's panel, takes on its tint, and slides the content in from the side you came from. On narrow
 * screens a Menu button grows it into a card you can drill into.
 */
export function BloomMenu({ items, brand, action, label = "Main", className }: BloomMenuProps) {
  const still = useStill();
  const uid = useId();
  const [open, setOpen] = useState<string | null>(null);
  const [menu, setMenu] = useState<"closed" | "list" | string>("closed");
  const [hovered, setHovered] = useState<string | null>(null);
  const [dir, setDir] = useState(0);
  const [bar, setBar] = useState({ w: 0, h: 56 });
  const [room, setRoom] = useState(0);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const root = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const menuButton = useRef<HTMLButtonElement>(null);
  const shut = useRef<ReturnType<typeof setTimeout>>(undefined);

  const onHeight = useCallback((id: string, h: number) => {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  useIsoLayoutEffect(() => {
    const b = barRef.current;
    const r = root.current;
    if (!b || !r) return;
    const fit = () => {
      setBar({ w: b.offsetWidth, h: b.offsetHeight });
      setRoom(r.offsetWidth);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    ro.observe(r);
    return () => ro.disconnect();
  }, []);

  const index = (id: string | null) => items.findIndex((i) => i.id === id);

  const show = (id: string) => {
    clearTimeout(shut.current);
    if (id === open) return;
    setDir(open === null ? 0 : Math.sign(index(id) - index(open)));
    setOpen(id);
  };

  const hide = (now = false) => {
    clearTimeout(shut.current);
    if (now) {
      setOpen(null);
      setMenu("closed");
    } else {
      shut.current = setTimeout(() => setOpen(null), CLOSE_DELAY);
    }
  };

  useEffect(() => () => clearTimeout(shut.current), []);

  // Escape closes whatever is open and hands focus back to what opened it.
  useEffect(() => {
    if (open === null && menu === "closed") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const back = open ? triggers.current[open] : menuButton.current;
      hide(true);
      back?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The surface: the bar's pill when closed, the open panel's shape otherwise, centred under the bar.
  const item = items.find((i) => i.id === open);
  const phone = menu !== "closed";
  const panelW = item ? Math.min(item.width, Math.max(bar.w, room - 24)) : bar.w;
  const width = item ? Math.max(bar.w, panelW) : bar.w;
  const viewKey = phone ? `m:${menu}` : item ? `d:${item.id}` : null;
  const height = bar.h + (viewKey ? (heights[viewKey] ?? 240) : 0);
  const expanded = item !== undefined || phone;
  const tint = item?.tint ?? (phone && menu !== "list" ? items.find((i) => i.id === menu)?.tint : undefined) ?? GLASS;

  const enter = (d: number) =>
    still
      ? { opacity: 0 }
      : d === 0
        ? { opacity: 0, y: -8, filter: "blur(4px)" }
        : { opacity: 0, x: d * 56, filter: "blur(6px)" };
  const leaveTo = (d: number) =>
    still ? { opacity: 0 } : d === 0 ? { opacity: 0, y: -6, filter: "blur(4px)" } : { opacity: 0, x: -d * 56, filter: "blur(6px)" };

  const panelId = `${uid}-panel`;

  return (
    <div ref={root} className={cn("relative flex justify-center [container-type:inline-size]", className)}>
      <div
        className="relative w-full @2xl:w-auto"
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch" && open !== null) hide();
        }}
        onPointerEnter={() => clearTimeout(shut.current)}
      >
        {/* The surface that reshapes. Panels live inside it, so they're clipped to its shape as it grows. */}
        <motion.div
          initial={false}
          animate={{
            width,
            height,
            x: (bar.w - width) / 2,
            borderRadius: expanded ? 24 : bar.h / 2,
            backgroundColor: tint,
            boxShadow: expanded
              ? "0 1px 2px rgba(20,16,10,0.06), 0 30px 60px -24px rgba(20,16,10,0.35)"
              : "0 1px 2px rgba(20,16,10,0.06), 0 10px 30px -18px rgba(20,16,10,0.3)",
          }}
          transition={still ? { duration: 0 } : MORPH}
          className="absolute top-0 left-0 overflow-hidden ring-1 ring-black/[0.06] backdrop-blur-xl"
        >
          <div id={panelId} className="absolute left-1/2 -translate-x-1/2" style={{ top: bar.h, width: phone ? bar.w : panelW }}>
            <AnimatePresence initial={false} mode="popLayout" custom={dir}>
              {viewKey && (
                <motion.div
                  key={viewKey}
                  custom={dir}
                  variants={{ enter, center: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" }, exit: leaveTo }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={still ? { duration: 0.15 } : SLIDE}
                >
                  <Fit id={viewKey} onHeight={onHeight}>
                    {phone ? (
                      menu === "list" ? (
                        <ul className="flex flex-col p-2 pt-1">
                          {items.map((i) => (
                            <li key={i.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setDir(1);
                                  setMenu(i.id);
                                }}
                                className="flex w-full items-center justify-between rounded-[16px] px-4 py-3.5 text-left text-[22px] font-semibold tracking-[-0.03em] transition-colors hover:bg-black/[0.04]"
                              >
                                {i.label}
                                <ChevronRight size={20} strokeWidth={1.75} aria-hidden className="opacity-40" />
                              </button>
                            </li>
                          ))}
                          {action != null && <li className="px-2 pt-3 pb-2">{action}</li>}
                        </ul>
                      ) : (
                        <div className="p-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setDir(-1);
                              setMenu("list");
                            }}
                            className="flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-medium opacity-60 transition-opacity hover:opacity-100"
                          >
                            <ChevronLeft size={16} strokeWidth={2} aria-hidden />
                            Back
                          </button>
                          {(() => {
                            const i = items.find((x) => x.id === menu);
                            return i ? (i.compact ?? i.content) : null;
                          })()}
                        </div>
                      )
                    ) : (
                      item?.content
                    )}
                  </Fit>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <nav
          ref={barRef}
          aria-label={label}
          className="relative z-10 flex h-14 w-full items-center gap-1 pr-2 pl-5 @2xl:w-auto"
        >
          <div className="mr-auto flex shrink-0 items-center pr-4">{brand}</div>

          <ul className="hidden items-center @2xl:flex" onPointerLeave={() => setHovered(null)}>
            {items.map((i) => {
              const on = open === i.id;
              return (
                <li key={i.id} className="relative">
                  <button
                    ref={(el) => {
                      triggers.current[i.id] = el;
                    }}
                    type="button"
                    aria-expanded={on}
                    aria-controls={panelId}
                    onPointerEnter={(e) => {
                      setHovered(i.id);
                      if (e.pointerType !== "touch") show(i.id);
                    }}
                    onClick={() => (on ? hide(true) : show(i.id))}
                    className="relative rounded-full px-4 py-2 text-[14px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                  >
                    {(hovered ?? open) === i.id && (
                      <motion.span
                        layoutId={`${uid}-hover`}
                        transition={still ? { duration: 0 } : { type: "spring", duration: 0.35, bounce: 0.15 }}
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-black/[0.06]"
                      />
                    )}
                    <span className="relative">{i.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="hidden shrink-0 pl-3 @2xl:block">{action}</div>

          <button
            ref={menuButton}
            type="button"
            aria-expanded={phone}
            aria-controls={panelId}
            onClick={() => {
              setDir(0);
              setMenu(phone ? "closed" : "list");
            }}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium transition-colors hover:bg-black/[0.05] @2xl:hidden"
          >
            {phone ? "Close" : "Menu"}
            <span aria-hidden className="relative block h-2.5 w-3.5">
              <motion.span
                initial={false}
                animate={{ y: phone ? 4 : 0, rotate: phone ? 45 : 0 }}
                transition={MORPH}
                className="absolute inset-x-0 top-0 h-[1.5px] rounded-full bg-current"
              />
              <motion.span
                initial={false}
                animate={{ y: phone ? -4 : 0, rotate: phone ? -45 : 0 }}
                transition={MORPH}
                className="absolute inset-x-0 bottom-0 h-[1.5px] rounded-full bg-current"
              />
            </span>
          </button>
        </nav>
      </div>
    </div>
  );
}

export default BloomMenu;
