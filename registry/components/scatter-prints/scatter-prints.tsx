"use client";

import { animate, useReducedMotionConfig, type AnimationPlaybackControls } from "motion/react";
import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
/** Settle into place with a little give, like a print landing on a table. */
const LAND = { type: "spring", stiffness: 260, damping: 20 } as const;
const GATHER = { type: "spring", stiffness: 210, damping: 24 } as const;
const GROW = { type: "spring", duration: 0.75, bounce: 0.12 } as const;
const SHRINK = { type: "spring", duration: 0.55, bounce: 0 } as const;
/** Tilts for a gathered stack, under the top print first. */
const STACK_TILT = [-8, 6, -5, 7, -3];
const STACK_MAX = 6;
/** How long the pointer has to rest before the prints gather. */
const REST_MS = 240;
/** The white border around each photo, in px; the open view grows out of the photo inside it. */
const BORDER = 5;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const jitter = (n: number) => (Math.random() * 2 - 1) * n;

const subscribe = () => () => {};
/** Reduced motion, but only once hydrated, so the first client render matches the server's. */
function useStill() {
  const reduce = useReducedMotionConfig();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  return hydrated && reduce === true;
}

export interface ScatterPrint {
  /** Photo for the print. Small is fine; `full` is used when it opens. */
  src: string;
  /** A larger copy for the open view. Falls back to `src`. */
  full?: string;
  /** Describes the photo for screen readers. */
  alt?: string;
  /** A short line printed under the photo, like a place name. */
  caption?: string;
  /** A second line for the open view, like the country. */
  location?: string;
  /** A colour from the photo. The page drifts toward it while this print is the newest. */
  tone?: string;
}

export interface ScatterPrintsProps {
  /** Photos to deal out, in order. They repeat when the trail runs past the end. */
  prints: ScatterPrint[];
  /** What the prints scatter over. Text inherits the colour the page drifts to. */
  children?: ReactNode;
  /** Pointer travel, in px, between two prints. */
  spacing?: number;
  /** How long a print stays before it drops away, in ms. */
  linger?: number;
  /** Most prints on screen at once. */
  max?: number;
  /** Gather the last few prints into a stack under the pointer when it rests; click the stack to open the top print. */
  gather?: boolean;
  className?: string;
}

type State = "idle" | "live" | "leaving" | "stacked" | "open";

interface Slot {
  state: State;
  photo: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  z: number;
  timer?: ReturnType<typeof setTimeout>;
  run?: AnimationPlaybackControls;
}

interface Point {
  x: number;
  y: number;
}

export function ScatterPrints({
  prints,
  children,
  spacing = 80,
  linger = 900,
  max = 12,
  gather = true,
  className,
}: ScatterPrintsProps) {
  const still = useStill();
  const stage = useRef<HTMLDivElement>(null);
  const cursor = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const sheetImg = useRef<HTMLImageElement>(null);
  const sheetText = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const slots = useRef<Slot[]>([]);
  const track = useRef({
    last: null as (Point & { t: number }) | null,
    drop: null as Point | null,
    vx: 0,
    vy: 0,
    next: 0,
    photo: 0,
    z: 0,
    stacked: false,
    /** Where the pointer rested when the stack gathered. */
    anchor: null as Point | null,
    open: null as number | null,
    rest: undefined as ReturnType<typeof setTimeout> | undefined,
    shut: undefined as ReturnType<typeof setTimeout> | undefined,
  });

  // Load every print up front, so one never lands empty.
  useEffect(() => {
    prints.forEach(({ src }) => {
      const img = new Image();
      img.src = src;
    });
  }, [prints]);

  useEffect(() => {
    const list = slots.current;
    const t = track.current;
    return () => {
      clearTimeout(t.rest);
      clearTimeout(t.shut);
      list.forEach((s) => {
        clearTimeout(s.timer);
        s.run?.stop();
      });
    };
  }, []);

  const slot = (i: number) =>
    (slots.current[i] ??= { state: "idle", photo: 0, x: 0, y: 0, rotate: 0, scale: 1, z: 0 });

  const setCursor = (mode: "" | "open" | "close") => {
    if (cursor.current) cursor.current.dataset.mode = mode;
  };

  const setTone = (tone?: string) => {
    if (!stage.current) return;
    if (tone) stage.current.style.setProperty("--sp-tone", tone);
    else stage.current.style.removeProperty("--sp-tone");
  };

  /** The print drops a little, tips further and fades out of focus. */
  const leave = (i: number, delay = 0) => {
    const el = els.current[i];
    const s = slot(i);
    if (!el || s.state === "idle" || s.state === "leaving" || s.state === "open") return;
    clearTimeout(s.timer);
    s.run?.stop();
    s.state = "leaving";
    if (still) {
      s.run = animate(el, { opacity: 0 }, { duration: 0.3, delay });
    } else {
      const tip = s.rotate >= 0 ? 1 : -1;
      s.run = animate(
        el,
        { y: s.y + 28, rotate: s.rotate + tip * 6, scale: s.scale * 0.92, opacity: 0, filter: ["blur(0px)", "blur(6px)"] },
        { duration: 0.6, delay, ease: [0.5, 0, 0.75, 0], opacity: { duration: 0.5, delay: delay + 0.1, ease: "easeIn" } },
      );
    }
    s.timer = setTimeout(
      () => {
        if (s.state === "leaving") s.state = "idle";
      },
      (delay + 0.65) * 1000,
    );
  };

  /** Deals the next print onto a point: it flips in from the way the pointer is moving and lands with some give. */
  const drop = (px: number, py: number, fan?: { tilt: number; dx: number; dy: number }) => {
    const t = track.current;
    const i = t.next;
    t.next = (t.next + 1) % max;
    const el = els.current[i];
    if (!el || prints.length === 0) return;
    const s = slot(i);
    clearTimeout(s.timer);
    s.run?.stop();
    el.style.filter = "none";

    s.photo = t.photo % prints.length;
    t.photo += 1;
    const photo = prints[s.photo];
    const img = el.querySelector("img");
    if (img && img.getAttribute("src") !== photo.src) img.src = photo.src;
    const caption = el.querySelector("figcaption");
    if (caption) caption.textContent = photo.caption ?? "";
    t.z += 1;
    s.z = t.z;
    el.style.zIndex = String(t.z);
    setTone(photo.tone);

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const speed = Math.hypot(t.vx, t.vy);
    const dir = t.vx === 0 ? 1 : Math.sign(t.vx);
    const tilt = fan ? fan.tilt : clamp(t.vx * 9, -14, 14) + jitter(4);
    const scale = 0.94 + Math.min(speed, 2.5) * 0.05;
    const x = px - w / 2 + (fan?.dx ?? 0);
    const y = py - h / 2 + (fan?.dy ?? 0);
    const tossX = fan ? 0 : clamp(t.vx * 40, -46, 46);
    const tossY = fan ? 0 : clamp(t.vy * 40, -46, 46);
    Object.assign(s, { state: "live", x: x + tossX, y: y + tossY, rotate: tilt, scale });

    if (still) {
      animate(el, { x: s.x, y: s.y, rotate: tilt, scale: 1 }, { duration: 0 });
      s.run = animate(el, { opacity: [0, 1] }, { duration: 0.2 });
    } else {
      s.run = animate(
        el,
        {
          x: [x, s.x],
          y: [y, s.y],
          rotate: [tilt - dir * 14, tilt],
          rotateY: [-dir * 62, 0],
          rotateX: [clamp(-t.vy * 30, -40, 40) + 18, 0],
          transformPerspective: [900, 900],
          scale: [0.55, scale],
          opacity: [0, 1],
        },
        { default: LAND, x: { duration: 0.55, ease: OUT }, y: { duration: 0.55, ease: OUT }, opacity: { duration: 0.16 } },
      );
    }
    s.timer = setTimeout(() => leave(i), linger + (fan ? 500 : 0));
  };

  /** When the pointer rests, the newest prints fly in and pile up under it. */
  const gatherAt = (px: number, py: number) => {
    if (!gather || still || track.current.open !== null) return;
    const live = slots.current
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.state === "live")
      .sort((a, b) => a.s.z - b.s.z);
    if (live.length < 3) return;
    live.slice(0, -STACK_MAX).forEach(({ i }) => leave(i));
    const pile = live.slice(-STACK_MAX);
    track.current.stacked = true;
    track.current.anchor = { x: px, y: py };
    setCursor("open");
    pile.forEach(({ s, i }, j) => {
      const el = els.current[i];
      if (!el) return;
      clearTimeout(s.timer);
      s.run?.stop();
      s.state = "stacked";
      const fromTop = pile.length - 1 - j;
      const to = {
        x: px - el.offsetWidth / 2 + fromTop * 3,
        y: py - el.offsetHeight / 2 + fromTop * 4,
        rotate: fromTop === 0 ? -2 : STACK_TILT[(fromTop - 1) % STACK_TILT.length],
        scale: 1,
      };
      Object.assign(s, to);
      s.run = animate(el, to, { ...GATHER, delay: j * 0.035 });
    });
  };

  /** Moving again sends the stack away, newest first. */
  const scatter = () => {
    track.current.stacked = false;
    setCursor("");
    slots.current
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.state === "stacked")
      .sort((a, b) => b.s.z - a.s.z)
      .forEach(({ i }, k) => leave(i, k * 0.04));
  };

  /** Where the photo inside a print sits, for the open view to grow out of and shrink back into. */
  const photoBox = (i: number) => {
    const el = els.current[i]!;
    const s = slot(i);
    const w = el.offsetWidth;
    const inner = w - BORDER * 2;
    // The print is drawn around its centre, so its photo's centre sits above the print's by half the caption strip.
    const strip = el.offsetHeight - BORDER - inner * 1.25;
    const cx = s.x + w / 2;
    const cy = s.y + el.offsetHeight / 2 - strip / 2;
    return {
      left: cx - (inner * s.scale) / 2,
      top: cy - (inner * 1.25 * s.scale) / 2,
      width: inner * s.scale,
      height: inner * 1.25 * s.scale,
      rotate: s.rotate,
    };
  };

  /** The top print of the stack grows into a full view of its photo. */
  const open = () => {
    const t = track.current;
    const box = stage.current;
    const view = sheet.current;
    const img = sheetImg.current;
    const text = sheetText.current;
    const top = slots.current
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.state === "stacked")
      .sort((a, b) => b.s.z - a.s.z)[0];
    if (!top || !box || !view || !img || !text) return;

    const { i, s } = top;
    const photo = prints[s.photo];
    clearTimeout(t.shut);
    t.open = i;
    t.stacked = false;
    setCursor("close");
    setTone(photo.tone);

    img.src = photo.src;
    if (photo.full) {
      const big = new Image();
      big.onload = () => {
        if (t.open === i) img.src = photo.full!;
      };
      big.src = photo.full;
    }
    const [place, where] = text.children;
    place.textContent = photo.caption ?? "";
    where.textContent = photo.location ?? "";

    const from = photoBox(i);
    view.style.display = "block";
    view.style.zIndex = String(t.z + 1);
    animate(
      view,
      {
        left: [from.left, 0],
        top: [from.top, 0],
        width: [from.width, box.clientWidth],
        height: [from.height, box.clientHeight],
        rotate: [from.rotate, 0],
        borderRadius: [2, 0],
        opacity: [1, 1],
      },
      GROW,
    );
    animate(text, { opacity: [0, 1], y: [18, 0] }, { delay: 0.32, duration: 0.5, ease: OUT });

    const el = els.current[i];
    clearTimeout(s.timer);
    s.run?.stop();
    s.state = "open";
    if (el) el.style.opacity = "0";
    slots.current
      .map((o, k) => ({ o, k }))
      .filter(({ o }) => o.state === "stacked")
      .forEach(({ k }, j) => leave(k, j * 0.03));
  };

  /** The open view shrinks back into its print, which then drops away like the rest. */
  const close = () => {
    const t = track.current;
    const i = t.open;
    const view = sheet.current;
    const text = sheetText.current;
    if (i === null || !view || !text) return;
    t.open = null;
    setCursor("");
    const to = photoBox(i);
    animate(text, { opacity: 0, y: 8 }, { duration: 0.15 });
    animate(view, { ...to, borderRadius: 2 }, SHRINK);
    t.shut = setTimeout(() => {
      view.style.display = "none";
      const el = els.current[i];
      const s = slot(i);
      if (el && s.state === "open") {
        el.style.opacity = "1";
        s.state = "live";
        leave(i, 0.15);
      }
    }, 520);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // close only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const local = (e: PointerEvent): Point => {
    const r = stage.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    const p = local(e);
    const t = track.current;
    const now = performance.now();
    if (cursor.current) {
      cursor.current.style.opacity = "1";
      cursor.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
    }
    if (t.last) {
      const dt = Math.max(1, now - t.last.t);
      t.vx += ((p.x - t.last.x) / dt - t.vx) * 0.35;
      t.vy += ((p.y - t.last.y) / dt - t.vy) * 0.35;
    }
    t.last = { ...p, t: now };
    // While a print is open, the pointer only steers the cursor.
    if (t.open !== null) return;
    // A small drift while reaching to click keeps the stack; moving off for real scatters it.
    if (t.stacked) {
      if (t.anchor && Math.hypot(p.x - t.anchor.x, p.y - t.anchor.y) < 24) return;
      scatter();
      t.drop = p;
    }

    clearTimeout(t.rest);
    t.rest = setTimeout(() => {
      t.vx = 0;
      t.vy = 0;
      gatherAt(p.x, p.y);
    }, REST_MS);

    if (!t.drop) {
      t.drop = p;
      return;
    }
    // A fast flick can cover several spacings in one event; fill the gap, up to three prints.
    const dist = Math.hypot(p.x - t.drop.x, p.y - t.drop.y);
    const steps = Math.min(3, Math.floor(dist / spacing));
    for (let k = 1; k <= steps; k++) {
      const f = (k * spacing) / dist;
      drop(t.drop.x + (p.x - t.drop.x) * f, t.drop.y + (p.y - t.drop.y) * f);
    }
    if (steps > 0) t.drop = p;
  };

  const onPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    // A finger "leaves" as soon as it lifts; the tapped prints should still play out.
    if (e.pointerType === "touch") return;
    const t = track.current;
    clearTimeout(t.rest);
    t.last = null;
    t.drop = null;
    t.stacked = false;
    if (cursor.current) cursor.current.style.opacity = "0";
    close();
    setCursor("");
    setTone();
    slots.current
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.state === "live" || s.state === "stacked")
      .sort((a, b) => b.s.z - a.s.z)
      .forEach(({ i }, k) => leave(i, k * 0.03));
  };

  // On a touchscreen there's no hover: a tap deals a small fan of prints instead.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch") return;
    const p = local(e);
    track.current.vx = 0;
    track.current.vy = 0;
    [-1, 0, 1].forEach((k) => drop(p.x, p.y, { tilt: k * 12 + jitter(2), dx: k * 38, dy: Math.abs(k) * 10 }));
  };

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if ((e.nativeEvent as globalThis.PointerEvent).pointerType === "touch") return;
    if (track.current.open !== null) close();
    else if (track.current.stacked) open();
  };

  return (
    <div
      ref={stage}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
      onClick={onClick}
      style={{ "--sp-w": "clamp(112px, 15cqw, 196px)" } as CSSProperties}
      className={cn(
        "relative isolate overflow-clip [container-type:inline-size] [@media(pointer:fine)]:cursor-none",
        "[--sp-caption:#6f6a60] [--sp-frame:#fffdf8] [--sp-ink-base:#15130f] [--sp-paper:#f3efe6] [--sp-tone:#a39985]",
        "[--sp-bg:color-mix(in_oklab,var(--sp-tone)_20%,var(--sp-paper))] [--sp-ink:color-mix(in_oklab,var(--sp-tone)_40%,var(--sp-ink-base))]",
        "bg-(--sp-bg) text-(--sp-ink) transition-[background-color,color] duration-[1100ms] ease-out",
        className,
      )}
    >
      {children}

      <div aria-hidden className="pointer-events-none absolute inset-0 z-10">
        {Array.from({ length: max }, (_, i) => {
          const photo = prints[i % Math.max(1, prints.length)];
          return (
            <figure
              key={i}
              ref={(el) => {
                els.current[i] = el;
              }}
              style={{ padding: `${BORDER}px ${BORDER}px 0` }}
              className="absolute top-0 left-0 m-0 w-(--sp-w) rounded-[4px] bg-(--sp-frame) opacity-0 shadow-[0_1px_2px_rgb(0_0_0/0.08),0_22px_40px_-20px_rgb(0_0_0/0.45)] will-change-transform"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so it works in any React app */}
              <img src={photo?.src} alt="" draggable={false} className="block aspect-[4/5] w-full rounded-[2px] object-cover" />
              <figcaption className="truncate px-0.5 py-[6px] font-mono text-[10px] leading-none tracking-[0.02em] text-(--sp-caption)">
                {photo?.caption}
              </figcaption>
            </figure>
          );
        })}

        {/* The open view: the top print's photo, grown to fill the stage. */}
        <div ref={sheet} className="absolute top-0 left-0 hidden overflow-hidden will-change-transform">
          {/* eslint-disable-next-line @next/next/no-img-element -- plain <img> so it works in any React app */}
          <img ref={sheetImg} alt="" draggable={false} className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
          <div ref={sheetText} className="absolute bottom-[clamp(20px,4.5cqw,44px)] left-[clamp(20px,4.5cqw,44px)] text-white opacity-0">
            <p className="text-[clamp(36px,8.5cqw,104px)] leading-[0.9] font-semibold tracking-[-0.045em]" />
            <p className="mt-3 font-mono text-[11px] tracking-[0.16em] text-white/75 uppercase" />
          </div>
        </div>
      </div>

      {/* A thin crosshair in place of the system cursor that inverts over whatever is under it, and turns into a
          label when there's something to click. */}
      <div
        ref={cursor}
        aria-hidden
        data-mode=""
        className="group pointer-events-none absolute top-0 left-0 z-30 hidden opacity-0 mix-blend-difference transition-opacity duration-200 data-[mode=close]:mix-blend-normal data-[mode=open]:mix-blend-normal [@media(pointer:fine)]:block"
      >
        <span className="absolute -top-[9px] left-0 h-[19px] w-px -translate-x-1/2 bg-white transition-transform duration-200 group-data-[mode=close]:scale-0 group-data-[mode=open]:scale-0" />
        <span className="absolute top-0 -left-[9px] h-px w-[19px] -translate-y-1/2 bg-white transition-transform duration-200 group-data-[mode=close]:scale-0 group-data-[mode=open]:scale-0" />
        {(["open", "close"] as const).map((mode) => (
          <span
            key={mode}
            className={cn(
              "absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 scale-50 rounded-full px-3.5 py-1.5 text-[12px] font-medium whitespace-nowrap opacity-0 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.4)] transition-[opacity,scale] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
              mode === "open"
                ? "bg-(--sp-ink) text-(--sp-paper) group-data-[mode=open]:scale-100 group-data-[mode=open]:opacity-100"
                : "bg-white/90 text-[#15130f] backdrop-blur-md group-data-[mode=close]:scale-100 group-data-[mode=close]:opacity-100",
            )}
          >
            {mode === "open" ? "Open" : "Close"}
          </span>
        ))}
      </div>
    </div>
  );
}

export default ScatterPrints;
