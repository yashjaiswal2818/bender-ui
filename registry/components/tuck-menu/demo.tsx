"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { TuckMenu, useTuckMenu } from "./tuck-menu";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

interface Page {
  label: string;
  meta?: ReactNode;
  title: string;
  caption: string;
  /** Where the camera looks, in % of the frame, and how close. */
  focus: { x: number; y: number; zoom: number };
}

const PAGES: Page[] = [
  {
    label: "Home",
    title: "A slow walk through spring",
    caption: "Haru keeps a field guide to the hills behind town, one bloom at a time.",
    focus: { x: 32, y: 85, zoom: 1.25 },
  },
  {
    label: "Trails",
    meta: "12",
    title: "Twelve trails, all in bloom",
    caption: "Short loops, most under an hour, mapped by a robot with short legs.",
    focus: { x: 24, y: 66, zoom: 1.5 },
  },
  {
    label: "Journal",
    meta: <span className="rounded-full bg-[#79bcff] px-[0.7em] py-[0.25em] font-medium text-[#0c2a4d]">New</span>,
    title: "Notes from the orchard",
    caption: "The old cherry by the gate flowered nine days early this year.",
    focus: { x: 16, y: 18, zoom: 1.45 },
  },
  {
    label: "About",
    title: "Built to wander",
    caption: "Haru started as a weekend project and simply kept walking.",
    focus: { x: 68, y: 42, zoom: 1.4 },
  },
  {
    label: "Contact",
    title: "Walk with us",
    caption: "Group walks leave the meadow gate on Saturdays at nine.",
    focus: { x: 74, y: 86, zoom: 1.45 },
  },
];

const PHOTO = 1672 / 941;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** The page: one photo, with the camera moving to whichever link the menu is pointing at. */
function Scene() {
  const { peek } = useTuckMenu();
  const page = PAGES[peek];
  const { x, y, zoom } = page.focus;

  // How much of the photo's width and height the frame shows, so the camera can pan to the edge and no further.
  const frame = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(PHOTO);
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAspect(e.contentRect.width / Math.max(1, e.contentRect.height)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const xRoom = (zoom - Math.min(1, aspect / PHOTO)) * 50;
  const yRoom = (zoom - Math.min(1, PHOTO / aspect)) * 50;

  return (
    <>
      <div ref={frame} className="absolute inset-0" />
      <motion.img
        src="/own/tuck-menu/meadow.webp"
        alt="A small robot walking across a meadow under cherry trees in bloom"
        initial={false}
        animate={{
          scale: zoom,
          x: `${clamp(zoom * (50 - x), -xRoom, xRoom)}%`,
          y: `${clamp(zoom * (50 - y), -yRoom, yRoom)}%`,
        }}
        transition={{ duration: 1.1, ease: EASE }}
        className="absolute top-1/2 left-1/2 h-auto w-[max(100%,calc(100cqh*1.7768))] max-w-none -translate-x-1/2 -translate-y-1/2"
      />
      <div className="absolute inset-x-0 top-0 h-[24%] bg-linear-to-b from-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-linear-to-t from-black/50 to-transparent" />

      <div className="absolute bottom-[clamp(22px,7cqh,48px)] left-[clamp(18px,2.8cqw,40px)] grid w-[min(34rem,72%)] text-white">
        <AnimatePresence initial={false}>
          <motion.div
            key={peek}
            initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.45, ease: EASE }}
            className="self-end [grid-area:1/1]"
          >
            <p className="text-[clamp(28px,min(4.8cqw,9cqh),68px)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
              {page.title}
            </p>
            <p className="mt-[0.9em] max-w-[34ch] text-[clamp(13px,1.2cqw,16px)] text-white/80">{page.caption}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function Blossom({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <g fill="currentColor">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} cx="10" cy="5.3" rx="3.3" ry="4.5" transform={`rotate(${r} 10 10)`} />
        ))}
      </g>
      <circle cx="10" cy="10" r="1.9" fill="#fff" />
    </svg>
  );
}

function Footer() {
  const [copied, setCopied] = useState(false);
  const email = "hello@haru.garden";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <p className="text-white/45">Write to us</p>
      <div className="flex items-center justify-between gap-3 rounded-[14px] bg-white/[0.06] p-1.5 pl-3.5 ring-1 ring-white/10 ring-inset">
        <span className="truncate text-white/85">{email}</span>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-[10px] bg-(--tm-paper) px-3 py-1.5 text-[12.5px] font-medium text-(--tm-ink) transition-transform active:scale-95"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="flex gap-4 text-white/45">
        {["Instagram", "Strava", "Newsletter"].map((s) => (
          <a key={s} href="#" onClick={(e) => e.preventDefault()} className="transition-colors hover:text-white">
            {s}
          </a>
        ))}
      </p>
    </div>
  );
}

export default function TuckMenuDemo() {
  return (
    <TuckMenu
      links={PAGES.map(({ label, meta }) => ({ label, meta }))}
      brand={
        <span className="flex items-center gap-[0.45em] font-semibold tracking-[-0.02em] [text-shadow:0_1px_12px_rgba(0,0,0,0.25)]">
          <Blossom className="size-[1.15em] text-(--tm-accent)" />
          haru
        </span>
      }
      footer={<Footer />}
      className="h-[560px] rounded-2xl max-sm:h-[520px]"
    >
      <Scene />
    </TuckMenu>
  );
}
