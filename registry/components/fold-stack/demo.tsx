"use client";
/* eslint-disable @next/next/no-img-element -- plain <img> so the demo runs in any React app */

import { AnimatePresence, motion } from "motion/react";
import { Backpack, ChevronRight, Plane, Sun, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FoldStack, useFoldCard, type FoldCard } from "./fold-stack";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SNAP = { type: "spring", duration: 0.45, bounce: 0.2 } as const;
const THIN = { strokeWidth: 1.6 };

// Photos from Unsplash (free under the Unsplash License): a wing over cloud by Shreyaan Vashishtha, the Alfama
// skyline by Get Golden Visa, a Lisbon tram by Michiel Annaert.
const photo = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;
const WING = photo("1789187548634-1828690ff647", 1000);
const SKYLINE = photo("1744580162134-b9b64645f7c8", 1000);
const TRAM = photo("1606231377817-07be84f484c8", 120);

/** A header icon on a soft tint of the card's own colour. */
function Tint({ tone, children }: { tone: keyof typeof CHIP; children: ReactNode }) {
  return <span className={cn("grid size-full place-items-center", CHIP[tone])}>{children}</span>;
}

/** Two lines on the right of a header, like a byline. */
function Byline({ top, bottom }: { top: ReactNode; bottom: ReactNode }) {
  return (
    <div className="text-right leading-[1.3]">
      <p className="truncate text-[12.5px] font-medium text-(--fold-ink)">{top}</p>
      <p className="truncate text-[11.5px] text-(--fold-muted)">{bottom}</p>
    </div>
  );
}

/** A coloured status chip with a label and a value, split by a hairline. */
function Chip({ tone, label, value }: { tone: keyof typeof CHIP; label: string; value: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11.5px] leading-none", CHIP[tone])}>
      {label}
      <span className="h-2.5 w-px bg-current opacity-25" />
      <b className="font-semibold">{value}</b>
    </span>
  );
}
const CHIP = {
  green: "bg-[#e5f6dc] text-[#2d6b17]",
  red: "bg-[#fde4e1] text-[#a8291f]",
  blue: "bg-[#e1effd] text-[#1d5fa8]",
  amber: "bg-[#fdf0d7] text-[#8a5a06]",
};

/* ---------------------------------------------------------------- */
/* Flight                                                            */
/* ---------------------------------------------------------------- */

function FlightPhoto() {
  const { open } = useFoldCard();
  return (
    <>
      <motion.img
        src={WING}
        alt=""
        className="size-full object-cover"
        style={{ objectPosition: "50% 55%" }}
        initial={false}
        animate={{ scale: open ? 1 : 1.14 }}
        transition={{ duration: 1.4, ease: EASE }}
      />
      {/* A scrim for the type, deepest where the title sits. */}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgb(3_17_38/0.82),rgb(3_17_38/0.1)_55%,rgb(3_17_38/0.3))]" />
    </>
  );
}

function Flight() {
  const { open, index, goTo } = useFoldCard();
  const rise = (i: number) => ({
    initial: false as const,
    animate: { opacity: open ? 1 : 0, y: open ? 0 : 10 },
    transition: { duration: 0.6, ease: EASE, delay: open ? 0.15 + i * 0.08 : 0 },
  });
  return (
    <div className="relative flex h-[268px] flex-col justify-between p-5 text-white">
      <div className="flex items-start justify-between">
        <motion.div {...rise(0)} className="w-[54px] overflow-clip rounded-[14px] bg-white text-center text-neutral-950 shadow-[0_8px_20px_-8px_rgb(0_0_0/0.5)]">
          <p className="bg-neutral-950 py-1 text-[11px] font-medium text-white">Mar</p>
          <p className="pt-1 text-[21px] font-semibold leading-none">12</p>
          <p className="pb-1.5 pt-0.5 text-[10.5px] text-neutral-500">Fri</p>
        </motion.div>
        <motion.span {...rise(1)} className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[12px] backdrop-blur-md">
          <span className="size-1.5 rounded-full bg-[#7ee2a8]" /> On time
        </motion.span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <motion.div {...rise(2)}>
          <p className="text-[27px] font-semibold leading-[1.08] tracking-[-0.02em]">
            London to
            <br />
            Lisbon
          </p>
          <p className="mt-2 text-[13px] text-white/75">Flight 1351 · 06:40 → 09:25 · Seat 14A</p>
        </motion.div>
        <motion.button
          {...rise(3)}
          type="button"
          aria-label="Next card"
          onClick={() => goTo(index + 1)}
          whileTap={{ scale: 0.92 }}
          className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20 ring-1 ring-inset ring-white/25 backdrop-blur-md transition-colors hover:bg-white/30"
        >
          <ChevronRight className="size-5" />
        </motion.button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Weather                                                           */
/* ---------------------------------------------------------------- */

type Day = "Fri" | "Sat" | "Sun" | "Mon";
const DAYS: Day[] = ["Fri", "Sat", "Sun", "Mon"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
const TEMPS: Record<Day, number[]> = {
  Fri: [13, 14, 16, 17, 18, 19, 19, 18, 17, 16, 15, 14],
  Sat: [14, 15, 17, 19, 20, 21, 21, 20, 19, 17, 16, 15],
  Sun: [12, 13, 14, 15, 16, 15, 14, 13, 13, 12, 12, 11],
  Mon: [13, 15, 16, 18, 19, 20, 19, 19, 18, 16, 15, 14],
};
/** Hours with rain, by index into HOURS. */
const RAIN: Record<Day, number[]> = { Fri: [], Sat: [], Sun: [5, 6, 7, 8, 9, 10, 11], Mon: [] };
const SUMMARY: Record<Day, { sky: [keyof typeof CHIP, string]; rain: [keyof typeof CHIP, string]; wind: string }> = {
  Fri: { sky: ["green", "Clear"], rain: ["green", "0%"], wind: "12 km/h" },
  Sat: { sky: ["green", "Sunny"], rain: ["green", "0%"], wind: "9 km/h" },
  Sun: { sky: ["red", "Showers"], rain: ["blue", "80% from 2pm"], wind: "22 km/h" },
  Mon: { sky: ["green", "Bright"], rain: ["green", "5%"], wind: "14 km/h" },
};

function DayTabs({ value, onChange }: { value: Day; onChange: (d: Day) => void }) {
  return (
    <div role="tablist" aria-label="Day" className="flex rounded-full bg-(--fold-chip) p-0.5 text-[12px] font-medium">
      {DAYS.map((d) => (
        <button key={d} type="button" role="tab" aria-selected={value === d} onClick={() => onChange(d)} className="relative h-7 w-10 rounded-full">
          {value === d && <motion.span layoutId="fold-day" transition={SNAP} className="absolute inset-0 rounded-full bg-(--fold-paper) shadow-[0_1px_3px_rgb(0_0_0/0.14)]" />}
          <span className={cn("relative", value === d ? "text-(--fold-ink)" : "text-(--fold-muted)")}>{d}</span>
        </button>
      ))}
    </div>
  );
}

function Weather({ day }: { day: Day }) {
  const { open } = useFoldCard();
  const temps = TEMPS[day];
  const peak = temps.indexOf(Math.max(...temps));
  const s = SUMMARY[day];
  return (
    <div>
      <div className="flex gap-1.5">
        <Chip tone={s.sky[0]} label="Sky" value={s.sky[1]} />
        <Chip tone={s.rain[0]} label="Rain" value={s.rain[1]} />
        <Chip tone="amber" label="Wind" value={s.wind} />
      </div>
      <div className="relative mt-4 rounded-[18px] bg-[#f6f6f4] px-3 pb-2 pt-4 dark:bg-white/[0.04]">
        {/* Dashed guides at 20° and 15°. */}
        {[0.3, 0.62].map((t) => (
          <span key={t} aria-hidden className="absolute inset-x-3 border-t border-dashed border-black/[0.08] dark:border-white/10" style={{ top: `${t * 100}%` }} />
        ))}
        <div className="relative flex h-[118px] items-end gap-[5px]">
          {temps.map((t, i) => {
            const rain = RAIN[day].includes(i);
            const fill = rain
              ? "linear-gradient(to bottom, #3b97f3, #dcecfd)"
              : i === peak
                ? "linear-gradient(to bottom, #8fd14f, #eef8e2)"
                : undefined;
            return (
              <motion.div
                key={i}
                className={cn("flex-1 rounded-[7px]", !fill && "bg-[#e9e9e6] dark:bg-white/10")}
                style={{ background: fill, transformOrigin: "bottom" }}
                initial={false}
                animate={{ height: `${((t - 8) / 14) * 100}%`, scaleY: open ? 1 : 0 }}
                transition={{ height: SNAP, scaleY: { duration: 0.6, ease: EASE, delay: open ? 0.15 + i * 0.03 : 0 } }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex gap-[5px] text-center text-[9.5px] font-medium uppercase tracking-wide text-(--fold-muted)">
          {HOURS.map((h) => (
            <span key={h} className="flex-1">
              {h > 12 ? h - 12 : h}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-[12.5px] text-(--fold-muted)">
        Warmest at {HOURS[peak] > 12 ? HOURS[peak] - 12 : HOURS[peak]}pm, <b className="font-semibold text-(--fold-ink)">{temps[peak]}°</b>
        {RAIN[day].length > 0 && <> · pack the shell jacket</>}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Alfama: a photo with the day's stops pinned on it                */
/* ---------------------------------------------------------------- */

const STOPS = [
  { id: "vicente", name: "São Vicente de Fora", note: "Tiled cloisters, roof terrace", time: "10:00", walk: "6 min", x: 16, y: 41, color: "#8fd14f" },
  { id: "feira", name: "Feira da Ladra", note: "Flea market, Tue and Sat", time: "11:15", walk: "4 min", x: 62, y: 55, color: "#f2a516" },
  { id: "pantheon", name: "Panteão Nacional", note: "Dome walk, best at noon", time: "12:30", walk: "3 min", x: 80, y: 49, color: "#3b97f3" },
  { id: "tram", name: "Tram 28 stop", note: "Ride down to Baixa", time: "14:00", walk: "8 min", x: 30, y: 64, color: "#f0645a" },
];

function Alfama() {
  const { open } = useFoldCard();
  const [pick, setPick] = useState(0);
  const stop = STOPS[pick];
  // Lean the photo towards the picked stop, without ever showing an edge.
  const pan = (v: number) => `${Math.max(-5, Math.min(5, (50 - v) * 0.15))}%`;
  return (
    <div>
      <div className="relative h-[188px] overflow-clip rounded-[18px] bg-[#cfe2f2]">
        <motion.div
          className="absolute inset-x-0 top-1/2 aspect-[3/2] -translate-y-1/2"
          initial={false}
          animate={open ? { scale: 1.12, x: pan(stop.x), y: pan(stop.y) } : { scale: 1, x: "0%", y: "0%" }}
          transition={{ type: "spring", duration: 1.1, bounce: 0 }}
        >
          <img src={SKYLINE} alt="Alfama rooftops with São Vicente de Fora and the Panteão dome" className="size-full object-cover" />
          {STOPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={s.name}
              aria-pressed={pick === i}
              onClick={() => setPick(i)}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              <motion.span
                className="relative grid size-6 place-items-center rounded-full border-2 border-white shadow-[0_2px_8px_rgb(0_0_0/0.35)]"
                style={{ background: `color-mix(in oklab, ${s.color} 45%, transparent)` }}
                initial={false}
                animate={{ scale: !open ? 0 : pick === i ? 1.25 : 0.9 }}
                transition={{ ...SNAP, delay: open ? 0.35 + i * 0.08 : 0 }}
              >
                <span className="size-2 rounded-full ring-2 ring-white" style={{ background: s.color }} />
                {pick === i && open && (
                  <motion.span
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: s.color }}
                    initial={{ scale: 1, opacity: 0.8 }}
                    animate={{ scale: 2.2, opacity: 0 }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </motion.span>
            </button>
          ))}
        </motion.div>

        <div className="absolute inset-x-2.5 bottom-2.5 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {STOPS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPick(i)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-[6px] text-[11.5px] font-medium backdrop-blur-md transition-colors duration-300",
                pick === i ? "bg-white text-neutral-900 shadow-[0_2px_10px_rgb(0_0_0/0.18)]" : "bg-white/55 text-neutral-800 hover:bg-white/75",
              )}
            >
              <span className="size-1.5 rounded-full" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next stop"
            onClick={() => setPick((p) => (p + 1) % STOPS.length)}
            className="grid size-7 shrink-0 place-items-center rounded-full bg-white/55 text-neutral-800 backdrop-blur-md hover:bg-white/75"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="relative mt-3 h-11 overflow-clip">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={stop.id}
            className="flex h-11 items-center gap-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <span className="w-11 shrink-0 rounded-full py-1 text-center text-[12px] font-semibold tabular-nums" style={{ background: `color-mix(in oklab, ${stop.color} 20%, transparent)` }}>
              {stop.time}
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[14px] font-medium">{stop.name}</span>
              <span className="block truncate text-[12px] text-(--fold-muted)">{stop.note}</span>
            </span>
            <span className="shrink-0 text-[12px] text-(--fold-muted)">{stop.walk} walk</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Budget                                                            */
/* ---------------------------------------------------------------- */

type Currency = "EUR" | "GBP";
const SPEND = [
  { id: "stay", label: "Stay", spent: 320, limit: 350 },
  { id: "food", label: "Food", spent: 164, limit: 150 },
  { id: "transport", label: "Transport", spent: 78, limit: 120 },
  { id: "tickets", label: "Tickets", spent: 50, limit: 80 },
  { id: "coffee", label: "Coffee", spent: 21, limit: 30 },
  { id: "gifts", label: "Gifts", spent: 0, limit: 70 },
];
const SPENT = SPEND.reduce((n, s) => n + s.spent, 0);
const TOTAL = SPEND.reduce((n, s) => n + s.limit, 0);
const MOVE = 20;
const money = (eur: number, c: Currency) => (c === "EUR" ? `€${eur}` : `£${Math.round(eur * 0.85)}`);
const HATCH = "repeating-linear-gradient(115deg, rgb(0 0 0 / 0.11) 0 1px, transparent 1px 5px)";
const fillFor = (ratio: number) =>
  ratio > 1
    ? "linear-gradient(90deg, #ef3f33, #ffa49c)"
    : ratio > 0.85
      ? "linear-gradient(90deg, #f2a516, #fcdc93)"
      : "linear-gradient(90deg, #2f8ff0, #a6d4ff)";

function CurrencySwitch({ value, onChange }: { value: Currency; onChange: (c: Currency) => void }) {
  return (
    <div role="group" aria-label="Currency" className="flex rounded-full bg-(--fold-chip) p-0.5 text-[12px] font-medium">
      {(["EUR", "GBP"] as const).map((c) => (
        <button key={c} type="button" aria-pressed={value === c} onClick={() => onChange(c)} className="relative h-7 w-9 rounded-full">
          {value === c && <motion.span layoutId="fold-currency" transition={SNAP} className="absolute inset-0 rounded-full bg-(--fold-paper) shadow-[0_1px_3px_rgb(0_0_0/0.14)]" />}
          <span className={cn("relative", value === c ? "text-(--fold-ink)" : "text-(--fold-muted)")}>{c === "EUR" ? "€" : "£"}</span>
        </button>
      ))}
    </div>
  );
}

function Budget({ currency, moved, setMoved }: { currency: Currency; moved: boolean; setMoved: (m: boolean) => void }) {
  const { open } = useFoldCard();
  const limit = (id: string, base: number) => base + (moved ? (id === "food" ? MOVE : id === "gifts" ? -MOVE : 0) : 0);
  return (
    <div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 @md:gap-x-6">
        {SPEND.map((s, i) => {
          const cap = limit(s.id, s.limit);
          const ratio = s.spent / cap;
          return (
            <div key={s.id} className="min-w-0">
              <p className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="truncate font-medium">{s.label}</span>
                <span className="shrink-0 whitespace-nowrap tabular-nums text-(--fold-muted)">
                  <b className="font-semibold text-(--fold-ink)">{money(s.spent, currency)}</b> / {money(cap, currency)}
                </span>
              </p>
              <div className="mt-1.5 h-[7px] overflow-clip rounded-full" style={{ backgroundImage: HATCH }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: fillFor(ratio) }}
                  initial={false}
                  animate={{ width: open ? `${Math.min(ratio, 1) * 100}%` : "0%" }}
                  transition={{ type: "spring", duration: 0.9, bounce: 0, delay: open ? 0.15 + i * 0.06 : 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className={cn("mt-4 flex h-[58px] items-center gap-3 rounded-[16px] px-3.5 transition-colors duration-500", moved ? "bg-[#e5f6dc]" : "bg-[#e1effd]")}>
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={String(moved)}
            className="min-w-0 flex-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <p className={cn("text-[12.5px] font-semibold", moved ? "text-[#2d6b17]" : "text-[#1d5fa8]")}>
              {moved ? "Back within budget" : `Food is ${money(14, currency)} over`}
            </p>
            <p className={cn("truncate text-[12px]", moved ? "text-[#2d6b17]/80" : "text-[#1d5fa8]/80")}>
              {moved ? `Moved ${money(MOVE, currency)} from gifts to food.` : `Move ${money(MOVE, currency)} over from gifts?`}
            </p>
          </motion.div>
        </AnimatePresence>
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => setMoved(!moved)}
          className="h-8 shrink-0 rounded-full bg-white px-3.5 text-[12.5px] font-medium text-neutral-900 shadow-[0_1px_3px_rgb(0_0_0/0.1)]"
        >
          {moved ? "Undo" : "Move it"}
        </motion.button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Packing                                                           */
/* ---------------------------------------------------------------- */

const ITEMS: { name: string; why?: [keyof typeof CHIP, string] }[] = [
  { name: "Passport" },
  { name: "Shell jacket", why: ["blue", "Rain on Sunday"] },
  { name: "Walking shoes", why: ["amber", "Alfama is steep"] },
  { name: "Plug adapter", why: ["green", "Type F"] },
  { name: "Phone charger" },
];
/** Already in the bag and out of sight. */
const ELSEWHERE = 9;
const ALL = ITEMS.length + ELSEWHERE;

function Packing({ packed, toggle }: { packed: Record<string, boolean>; toggle: (item: string) => void }) {
  const { open } = useFoldCard();
  const count = ELSEWHERE + ITEMS.filter((i) => packed[i.name]).length;
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="h-[7px] flex-1 overflow-clip rounded-full" style={{ backgroundImage: HATCH }}>
          <motion.div
            className="h-full rounded-full bg-[linear-gradient(90deg,#6cc04a,#c5eaa8)]"
            initial={false}
            animate={{ width: open ? `${(count / ALL) * 100}%` : "0%" }}
            transition={{ type: "spring", duration: 0.8, bounce: 0, delay: open ? 0.15 : 0 }}
          />
        </div>
        <span className="text-[12.5px] tabular-nums text-(--fold-muted)">
          <b className="font-semibold text-(--fold-ink)">{count}</b> / {ALL}
        </span>
      </div>
      <ul className="mt-2">
        {ITEMS.map(({ name, why }, i) => {
          const on = !!packed[name];
          return (
            <motion.li
              key={name}
              initial={false}
              animate={{ opacity: open ? 1 : 0, y: open ? 0 : 6 }}
              transition={{ duration: 0.4, ease: EASE, delay: open ? 0.15 + i * 0.05 : 0 }}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(name)}
                className="flex h-10 w-full items-center gap-3 rounded-xl text-left text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-(--fold-ink)/20"
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-[6px] border-[1.5px] transition-colors duration-200", on ? "border-[#4fae2e] bg-[#4fae2e]" : "border-black/15 dark:border-white/20")}>
                  <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
                    <motion.path d="M5 12.5l4.5 4.5L19 7.5" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" initial={false} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 0.25, ease: EASE }} />
                  </svg>
                </span>
                <span className="relative">
                  <span className={cn("transition-colors duration-300", on && "text-(--fold-muted)")}>{name}</span>
                  <motion.span aria-hidden className="absolute inset-x-0 top-1/2 h-px origin-left bg-(--fold-muted)" initial={false} animate={{ scaleX: on ? 1 : 0 }} transition={{ duration: 0.3, ease: EASE }} />
                </span>
                {why && (
                  <span className={cn("ml-auto transition-opacity duration-300", on && "opacity-40")}>
                    <span className={cn("rounded-full px-2 py-[3px] text-[11px]", CHIP[why[0]])}>{why[1]}</span>
                  </span>
                )}
              </button>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export default function FoldStackDemo() {
  const [day, setDay] = useState<Day>("Sat");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [moved, setMoved] = useState(false);
  const [packed, setPacked] = useState<Record<string, boolean>>({ Passport: true });
  const packedCount = ELSEWHERE + ITEMS.filter((i) => packed[i.name]).length;

  const cards: FoldCard[] = [
    {
      id: "flight",
      title: "London to Lisbon",
      icon: <Plane {...THIN} />,
      meta: <Byline top="Gate B32" bottom="Boards 06:05" />,
      tone: "ink",
      bare: true,
      backdrop: <FlightPhoto />,
      content: <Flight />,
    },
    {
      id: "weather",
      title: "Weather",
      icon: (
        <Tint tone="amber">
          <Sun {...THIN} />
        </Tint>
      ),
      meta: <Byline top="21° on Saturday" bottom="Showers Sunday 2pm" />,
      aside: <DayTabs value={day} onChange={setDay} />,
      content: <Weather day={day} />,
    },
    {
      id: "alfama",
      title: "Alfama on foot",
      icon: <img src={TRAM} alt="" />,
      meta: <Byline top="4 stops" bottom="3.2 km, mostly uphill" />,
      content: <Alfama />,
    },
    {
      id: "budget",
      title: "Trip budget",
      icon: (
        <Tint tone="blue">
          <Wallet {...THIN} />
        </Tint>
      ),
      meta: <Byline top={`${money(SPENT, currency)} spent`} bottom={`of ${money(TOTAL, currency)}`} />,
      aside: <CurrencySwitch value={currency} onChange={setCurrency} />,
      content: <Budget currency={currency} moved={moved} setMoved={setMoved} />,
    },
    {
      id: "packing",
      title: "Packing list",
      icon: (
        <Tint tone="green">
          <Backpack {...THIN} />
        </Tint>
      ),
      meta: <Byline top={`${packedCount} of ${ALL} packed`} bottom="Leave Thursday night" />,
      content: <Packing packed={packed} toggle={(item) => setPacked((p) => ({ ...p, [item]: !p[item] }))} />,
    },
  ];

  return <FoldStack cards={cards} label="Lisbon trip" />;
}
