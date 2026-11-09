"use client";
/* eslint-disable @next/next/no-img-element -- plain <img> so the demo runs in any React app */

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { BloomMenu, type BloomMenuItem } from "./bloom-menu";

// Photos from Unsplash (free under the Unsplash License).
const photo = (id: string, w: number, h: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=72`;

const EASE = [0.22, 1, 0.36, 1] as const;

const SHOP = [
  { name: "Mugs", note: "Heavy enough for two hands", from: 28, img: "1784652587169-6b3933829d22" },
  { name: "Bowls", note: "Deep enough for soup", from: 34, img: "1761062404254-8e19c9e77d6f" },
  { name: "Vases", note: "One stem or a whole branch", from: 45, img: "1523263666618-c992b26eec21" },
  { name: "Plates", note: "Dinner, side and platters", from: 30, img: "1771830937026-3e3474fdd947" },
];

const CLASSES = [
  { name: "Wheel basics", when: "Four Tuesdays, 18:30", price: "€160", status: "2 spots left", short: true },
  { name: "Glaze lab", when: "One Saturday morning", price: "€70", status: "Next on 15 Nov" },
  { name: "Open studio", when: "Any weekday, for members", price: "€45/mo", status: "Join any time" },
];

const JOURNAL = [
  { title: "Why we fire at 1,240 degrees", date: "28 Oct", img: "1782351112349-a0b0806aa0ef" },
  { title: "Clay we dug up by the Douro", date: "14 Oct", img: "1520408222757-6f9f95d87d5d" },
  { title: "Eleven glazes that didn't make it", date: "30 Sep", img: "1781150363981-68490a49abeb" },
];

const hold = (e: MouseEvent) => e.preventDefault();

/** Shop: point at a category and the big photo beside the list follows. */
function Shop() {
  const [at, setAt] = useState(0);
  const pick = SHOP[at];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] gap-3 p-3 pt-1">
      <ul className="flex flex-col">
        {SHOP.map((s, i) => (
          <li key={s.name}>
            <a
              href="#"
              onClick={hold}
              onPointerEnter={() => setAt(i)}
              onFocus={() => setAt(i)}
              className={`flex items-center gap-3.5 rounded-[16px] px-2.5 py-2.5 outline-none transition-colors duration-300 ${at === i ? "bg-[#b86838]/[0.09]" : "hover:bg-black/[0.03]"}`}
            >
              <img src={photo(s.img, 120, 120)} alt="" className="size-11 shrink-0 rounded-[11px] object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-[-0.01em]">{s.name}</span>
                <span className="block truncate text-[13px] text-[#1d1a16]/60">{s.note}</span>
              </span>
              <span className="shrink-0 text-[12.5px] tabular-nums text-[#1d1a16]/50">from €{s.from}</span>
            </a>
          </li>
        ))}
        <li className="mt-1.5 px-2.5 pb-1 text-[12.5px] text-[#1d1a16]/55">Free shipping in Portugal over €60</li>
      </ul>

      <div className="relative min-h-[260px] overflow-hidden rounded-[18px] bg-[#e8dccd]">
        <AnimatePresence initial={false}>
          <motion.img
            key={pick.name}
            src={photo(pick.img, 640, 720)}
            alt={`Handmade ${pick.name.toLowerCase()}`}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="absolute inset-0 size-full object-cover"
          />
        </AnimatePresence>
      </div>
    </div>
  );
}

function Classes() {
  return (
    <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 p-3 pt-1">
      <div className="relative overflow-hidden rounded-[18px]">
        <img src={photo("1777451440787-3f5bc84b8834", 320, 520)} alt="Shelves of pots drying in the studio" className="absolute inset-0 size-full object-cover" />
      </div>
      <ul className="flex flex-col gap-0.5">
        {CLASSES.map((c) => (
          <li key={c.name}>
            <a href="#" onClick={hold} className="flex items-center gap-3 rounded-[16px] px-3 py-3 outline-none transition-colors hover:bg-[#4d9351]/[0.08] focus-visible:bg-[#4d9351]/[0.08]">
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold tracking-[-0.01em]">{c.name}</span>
                <span className="block text-[13px] text-[#1d1a16]/60">{c.when}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-[15px] font-semibold tabular-nums tracking-[-0.01em]">{c.price}</span>
                <span className={`block text-[12px] ${c.short ? "font-medium text-[#b86838]" : "text-[#1d1a16]/50"}`}>{c.status}</span>
              </span>
            </a>
          </li>
        ))}
        <li className="mt-1 px-3 pb-1 text-[12.5px] text-[#1d1a16]/55">Groups of six, clay and firing included</li>
      </ul>
    </div>
  );
}

function Journal() {
  return (
    <div className="p-3 pt-1">
      <div className="flex items-baseline justify-between px-1.5 pb-2.5">
        <p className="text-[12.5px] font-medium text-[#1d1a16]/55">From the studio</p>
        <a href="#" onClick={hold} className="group flex items-center gap-1 text-[12.5px] font-medium text-[#3786c3]">
          All entries
          <ArrowRight size={13} aria-hidden className="transition-transform group-hover:translate-x-0.5" />
        </a>
      </div>
      <ul className="grid grid-cols-3 gap-3">
        {JOURNAL.map((j) => (
          <li key={j.title}>
            <a href="#" onClick={hold} className="group block rounded-[16px] outline-none">
              <span className="block aspect-[4/3] overflow-hidden rounded-[14px] bg-black/5">
                <img
                  src={photo(j.img, 360, 270)}
                  alt=""
                  className="size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.06]"
                />
              </span>
              <span className="mt-2 block px-0.5 text-[11.5px] text-[#1d1a16]/50">{j.date}</span>
              <span className="block px-0.5 text-[14px] leading-snug font-semibold tracking-[-0.01em]">{j.title}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The phone versions: plain lists. */
function List({ rows }: { rows: { title: string; note: string }[] }) {
  return (
    <ul className="flex flex-col pb-1">
      {rows.map((r) => (
        <li key={r.title}>
          <a href="#" onClick={hold} className="block rounded-[14px] px-4 py-2.5 transition-colors hover:bg-black/[0.04]">
            <span className="block text-[16px] font-semibold tracking-[-0.01em]">{r.title}</span>
            <span className="block text-[13px] text-[#1d1a16]/60">{r.note}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

const ITEMS: BloomMenuItem[] = [
  {
    id: "shop",
    label: "Shop",
    width: 660,
    tint: "rgba(255, 240, 231, 0.96)",
    content: <Shop />,
    compact: <List rows={SHOP.map((s) => ({ title: s.name, note: s.note }))} />,
  },
  {
    id: "classes",
    label: "Classes",
    width: 560,
    tint: "rgba(235, 248, 235, 0.96)",
    content: <Classes />,
    compact: <List rows={CLASSES.map((c) => ({ title: c.name, note: `${c.when} · ${c.price}` }))} />,
  },
  {
    id: "journal",
    label: "Journal",
    width: 580,
    tint: "rgba(232, 245, 255, 0.96)",
    content: <Journal />,
    compact: <List rows={JOURNAL.map((j) => ({ title: j.title, note: j.date }))} />,
  },
];

export default function BloomMenuDemo() {
  return (
    <div className="relative h-[600px] overflow-clip rounded-[20px] bg-[#efe8de] text-[#1d1a16] max-sm:h-[640px]">
      <BloomMenu
        items={ITEMS}
        brand={<span className="text-[19px] font-semibold tracking-[-0.04em]">argila</span>}
        action={
          <a
            href="#"
            onClick={hold}
            className="inline-flex items-center rounded-full bg-[#b86838] px-4 py-2 text-[13.5px] font-medium text-white transition-colors hover:bg-[#a55c30]"
          >
            Book a class
          </a>
        }
        className="absolute inset-x-0 top-4 z-20 px-4"
      />

      <div className="grid h-full grid-cols-1 items-end gap-6 p-6 pt-28 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:items-center sm:p-10 sm:pt-24">
        <div>
          <h3 className="max-w-[12ch] text-[clamp(2.4rem,6vw,4.4rem)] leading-[0.95] font-semibold tracking-[-0.045em]">
            Pots made slowly, in Porto.
          </h3>
          <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-[#1d1a16]/65">
            A small ceramics studio in Bonfim. We throw, trim and fire everything here, and teach anyone who wants to
            get their hands dirty.
          </p>
        </div>
        <div className="relative hidden h-full max-h-[400px] overflow-hidden rounded-[24px] sm:block">
          <img
            src={photo("1520408222757-6f9f95d87d5d", 900, 900)}
            alt="Unfired clay vases drying on a table"
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
