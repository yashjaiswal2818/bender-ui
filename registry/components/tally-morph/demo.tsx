"use client";

import { TallyMorph, type TallyItem, type TallyMetric } from "./tally-morph";

const url = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=240&h=240&q=75`;

const STALLS: TallyItem[] = [
  {
    id: "bread",
    name: "Ostler's Loaves",
    detail: "Fenwick Gate",
    photo: url("1509440159596-0249088772ff"),
    tone: "clay",
    note: "Rye was gone by twenty to eleven. Both Saturdays this month, the second bake came too late.",
    values: { sat: 612, sun: 348, both: 960 },
    reserve: { sat: 140, sun: 80, both: 220 },
  },
  {
    id: "cheese",
    name: "Hollin Dairy",
    detail: "West Arches",
    photo: url("1486297678162-eb2a19b0a32d"),
    tone: "ochre",
    note: "The smoked cheddar went first. Sunday regulars asked for the last wheel by name.",
    values: { sat: 438, sun: 402, both: 840 },
    reserve: { sat: 90, sun: 60, both: 150 },
  },
  {
    id: "flowers",
    name: "Pell & Petal",
    detail: "Cobble Yard",
    photo: url("1563245372-f21724e3856d"),
    tone: "plum",
    note: "Dahlias sold out before noon; the yellow bunches were still there at close.",
    values: { sat: 301, sun: 276, both: 577 },
    reserve: { sat: 75, sun: 45, both: 120 },
  },
  {
    id: "honey",
    name: "Two Hives",
    detail: "Clock Tower",
    photo: url("1587049352846-4a222e784d38"),
    tone: "sage",
    note: "Heather jars outsold clover two to one once the rain stopped on Sunday.",
    values: { sat: 187, sun: 233, both: 420 },
    reserve: { sat: 60, sun: 40, both: 100 },
  },
  {
    id: "mugs",
    name: "Kiln Row Mugs",
    detail: "Old Bandstand",
    photo: url("1514432324607-a09d9b4aefdd"),
    tone: "slate",
    note: "Small blue mugs only. The tall ones are sitting in a crate until the glaze is fixed.",
    values: { sat: 254, sun: 119, both: 373 },
    reserve: { sat: 50, sun: 30, both: 80 },
  },
];

const METRICS: TallyMetric[] = [
  { id: "sat", label: "Saturday", prefix: "£" },
  { id: "sun", label: "Sunday", prefix: "£" },
  { id: "both", label: "Weekend", prefix: "£" },
];

export default function TallyMorphDemo() {
  return (
    <div className="flex w-full items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-lg">
        <header className="mb-5 px-1">
          <p className="text-xs font-semibold tracking-wider text-ink-2 uppercase">Market Ledger</p>
          <h3 className="mt-1 font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Fenwick Lane Takings
          </h3>
          <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">
            Columns keep the lane order; rows rank them. Select an item or use arrow keys.
          </p>
        </header>

        <TallyMorph items={STALLS} metrics={METRICS} defaultMetricId="both" defaultView="columns" />
      </div>
    </div>
  );
}
