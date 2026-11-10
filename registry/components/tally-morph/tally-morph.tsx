"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { motion, useReducedMotion, type Transition } from "motion/react";
import { Columns3, Rows3, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type TallyTone = "clay" | "sage" | "ochre" | "slate" | "plum" | "ink" | string;

export interface TallyItem {
  id: string;
  name: string;
  /** Image URL for square thumbnail / avatar */
  photo: string;
  /** Curated palette tone or any CSS color */
  tone?: TallyTone;
  /** Short detail, role, or station */
  detail?: string;
  /** Human note shown when the item is selected */
  note?: string;
  /** Primary committed value per metric/period key */
  values: Record<string, number>;
  /** Optional reserve, pending, or scheduled value per metric/period key */
  reserve?: Record<string, number>;
}

export interface TallyMetric {
  id: string;
  label: string;
  /** Optional unit suffix, e.g. "hrs", "pcs" */
  unit?: string;
  /** Optional prefix, e.g. "$" or "£" */
  prefix?: string;
  /** Optional custom value formatter */
  format?: (value: number) => string;
}

export type TallyViewMode = "columns" | "rows";

export interface TallyMorphProps {
  /** Items to display and morph between columns and ranked ledger */
  items: TallyItem[];
  /** Metric or time period lenses */
  metrics: TallyMetric[];
  /** Initial metric id */
  defaultMetricId?: string;
  /** Controlled metric id */
  metricId?: string;
  /** Called when the active metric changes */
  onMetricChange?: (metricId: string) => void;
  /** Initial view mode */
  defaultView?: TallyViewMode;
  /** Controlled view mode */
  view?: TallyViewMode;
  /** Called when the view mode changes */
  onViewChange?: (view: TallyViewMode) => void;
  /** Whether to show the reserve portion of values (default: true) */
  defaultShowReserve?: boolean;
  /** Height of the animation stage in pixels (default: 288) */
  stageHeight?: number;
  /** Accessible label for the stage group */
  label?: string;
  /** Additional CSS class names */
  className?: string;
}

type Shape = { x: number; y: number; w: number; h: number; r: number };

const PAD = 4;
const GAP = 8;
const THUMB = 36;
const MIN_BAR = 86;

const TONES: Record<string, { bg: string; text: string; accent: string }> = {
  clay: { bg: "#efe1dc", text: "#6e3a2c", accent: "#c47a65" },
  sage: { bg: "#dfebe4", text: "#2f5943", accent: "#6b967f" },
  ochre: { bg: "#efe7d6", text: "#664b1e", accent: "#b58b4c" },
  slate: { bg: "#dee7ef", text: "#2d4d66", accent: "#6a89a3" },
  plum: { bg: "#eae0e8", text: "#5b3b54", accent: "#94758d" },
  ink: { bg: "#e6e2d9", text: "#262420", accent: "#57534a" },
};

function resolveTone(tone?: string) {
  if (tone && tone in TONES) return TONES[tone];
  return {
    bg: tone || "oklch(0.86 0.055 240)",
    text: "inherit",
    accent: tone || "currentColor",
  };
}

const inset = (s: Shape, w: number, h: number, grow: number) =>
  `inset(${s.y + PAD - grow}px ${w + PAD - s.x - s.w - grow}px ${
    h + PAD - s.y - s.h - grow
  }px ${s.x + PAD - grow}px round ${s.r + grow}px)`;

export function TallyMorph({
  items,
  metrics,
  defaultMetricId,
  metricId: controlledMetricId,
  onMetricChange,
  defaultView = "columns",
  view: controlledView,
  onViewChange,
  defaultShowReserve = true,
  stageHeight = 288,
  label = "Takings by item",
  className,
}: TallyMorphProps) {
  const reduce = useReducedMotion();
  const [internalView, setInternalView] = useState<TallyViewMode>(defaultView);
  const view = controlledView ?? internalView;

  const [internalMetricId, setInternalMetricId] = useState<string>(
    defaultMetricId ?? metrics[0]?.id ?? "default"
  );
  const activeMetricId = controlledMetricId ?? internalMetricId;

  const [showReserve, setShowReserve] = useState<boolean>(defaultShowReserve);
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? "");

  const handleViewChange = (next: TallyViewMode) => {
    if (controlledView === undefined) setInternalView(next);
    onViewChange?.(next);
  };

  const handleMetricChange = (nextId: string) => {
    if (controlledMetricId === undefined) setInternalMetricId(nextId);
    onMetricChange?.(nextId);
  };

  // --- stage sizing & resize observer --------------------------------------
  const stageRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [resizing, setResizing] = useState(false);
  const lastWidth = useRef(0);
  const resizeTimer = useRef<number | undefined>(undefined);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => {
      const w = Math.round(el.getBoundingClientRect().width);
      if (lastWidth.current && w !== lastWidth.current) {
        setResizing(true);
        window.clearTimeout(resizeTimer.current);
        resizeTimer.current = window.setTimeout(() => setResizing(false), 140);
      }
      lastWidth.current = w;
      setWidth(w);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => {
      ro.disconnect();
      window.clearTimeout(resizeTimer.current);
    };
  }, []);

  // --- geometry & math -----------------------------------------------------
  const H = stageHeight;
  const n = items.length;

  const activeMetric = useMemo(
    () => metrics.find((m) => m.id === activeMetricId) ?? metrics[0],
    [metrics, activeMetricId]
  );

  const formatVal = (v: number) => {
    if (activeMetric?.format) return activeMetric.format(v);
    const formatted = v.toLocaleString("en-US");
    if (activeMetric?.prefix) return `${activeMetric.prefix}${formatted}`;
    if (activeMetric?.unit) return `${formatted} ${activeMetric.unit}`;
    return formatted;
  };

  const model = useMemo(() => {
    const primaries = items.map((it) => it.values[activeMetricId] ?? 0);
    const reserves = items.map((it) =>
      showReserve && it.reserve ? (it.reserve[activeMetricId] ?? 0) : 0
    );
    const totals = primaries.map((p, i) => p + reserves[i]);

    const max = Math.max(...totals, 1);
    const grandTotal = totals.reduce((a, b) => a + b, 0) || 1;

    const rankOrder = totals
      .map((v, i) => [v, i] as const)
      .sort((a, b) => b[0] - a[0] || a[1] - b[1])
      .map(([, i]) => i);

    const rankOf = new Array<number>(n);
    rankOrder.forEach((idx, rank) => (rankOf[idx] = rank));

    const colW = Math.max(0, (width - GAP * (n - 1)) / n);
    const rowH = (H - GAP * (n - 1)) / n;

    const columns: Shape[] = totals.map((v, i) => {
      const h = MIN_BAR + (v / max) * (H - MIN_BAR);
      return { x: i * (colW + GAP), y: H - h, w: colW, h, r: 16 };
    });

    const rows: Shape[] = totals.map((_, i) => ({
      x: 0,
      y: rankOf[i] * (rowH + GAP),
      w: width,
      h: rowH,
      r: 14,
    }));

    return { primaries, reserves, totals, grandTotal, rankOrder, rankOf, columns, rows, rowH, colW };
  }, [items, activeMetricId, showReserve, width, H, n]);

  const selIndex = Math.max(
    0,
    items.findIndex((i) => i.id === selectedId)
  );
  const selected = items[selIndex] ?? items[0];

  const hasAnyReserve = useMemo(() => {
    return items.some((it) => it.reserve && (it.reserve[activeMetricId] ?? 0) > 0);
  }, [items, activeMetricId]);

  // --- motion --------------------------------------------------------------
  const still = !!reduce || resizing;
  const move = (i: number): Transition =>
    still
      ? { duration: 0 }
      : { type: "spring", duration: 0.58, bounce: 0.12, delay: i * 0.02 };
  const fade = (show: boolean, i: number): Transition =>
    still
      ? { duration: 0 }
      : show
        ? { duration: 0.22, delay: 0.18 + i * 0.02 }
        : { duration: 0.12 };

  // --- keyboard navigation -------------------------------------------------
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const visualOrder = view === "rows" ? model.rankOrder : items.map((_, i) => i);

  const onStageKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const pos = visualOrder.indexOf(selIndex);
    let next = pos;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = Math.min(n - 1, pos + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = Math.max(0, pos - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;
    e.preventDefault();
    const target = visualOrder[next];
    setSelectedId(items[target].id);
    refs.current[target]?.focus();
  };

  const metricRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const onMetricKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = metrics.findIndex((m) => m.id === activeMetricId);
    let next = i;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % metrics.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (i - 1 + metrics.length) % metrics.length;
    else return;
    e.preventDefault();
    handleMetricChange(metrics[next].id);
    metricRefs.current[next]?.focus();
  };

  useEffect(() => {
    refs.current.length = n;
  }, [n]);

  const ready = width > 0;
  const share = Math.round((model.totals[selIndex] / model.grandTotal) * 100);

  return (
    <section
      className={cn(
        "w-full rounded-[26px] border border-line bg-surface p-4 text-ink sm:p-5",
        className
      )}
    >
      {/* Top Controls Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-line pb-3">
        {/* Metric / Period switcher */}
        <div
          role="radiogroup"
          aria-label="Metric lens"
          onKeyDown={onMetricKey}
          className="relative inline-flex items-center rounded-xl border border-line bg-tile p-0.5"
        >
          {metrics.map((m, i) => {
            const on = m.id === activeMetricId;
            return (
              <button
                key={m.id}
                ref={(el) => {
                  metricRefs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => handleMetricChange(m.id)}
                className={cn(
                  "relative h-7 cursor-pointer rounded-[9px] px-2.5 text-[12.5px] font-medium outline-none transition-colors sm:h-8 sm:px-3 sm:text-[13px]",
                  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                  on ? "text-ink font-semibold" : "text-ink-2 hover:text-ink"
                )}
              >
                {on && (
                  <motion.span
                    layoutId="active-metric-pill"
                    className="absolute inset-0 rounded-[9px] border border-line-2 bg-surface shadow-xs"
                    transition={still ? { duration: 0 } : { type: "spring", duration: 0.38, bounce: 0.1 }}
                  />
                )}
                <span className="relative z-10">{m.label}</span>
              </button>
            );
          })}
        </div>

        {/* Action controls: Reserve toggle + View mode toggle */}
        <div className="flex items-center gap-2">
          {hasAnyReserve && (
            <button
              type="button"
              aria-pressed={showReserve}
              onClick={() => setShowReserve((prev) => !prev)}
              className={cn(
                "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl px-2.5 text-[12px] font-medium transition-all outline-none sm:h-9 sm:text-[12.5px]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                showReserve
                  ? "border border-line-2 bg-tile text-ink font-semibold shadow-xs"
                  : "border border-transparent text-ink-2 hover:bg-tile/60 hover:text-ink"
              )}
              title={showReserve ? "Hide reserve values" : "Show reserve values"}
            >
              <Layers className="size-3.5" aria-hidden />
              <span>Reserve</span>
              <span
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  showReserve ? "bg-primary" : "bg-ink-3/40"
                )}
              />
            </button>
          )}

          <div
            role="group"
            aria-label="Layout"
            className="relative flex rounded-xl border border-line bg-tile p-0.5"
          >
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-[9px] border border-line-2 bg-surface shadow-xs"
              initial={false}
              animate={{ x: view === "rows" ? "100%" : "0%" }}
              transition={still ? { duration: 0 } : { type: "spring", duration: 0.38, bounce: 0.1 }}
            />
            {(
              [
                ["columns", "Columns, fixed order", Columns3],
                ["rows", "Rows, ranked", Rows3],
              ] as const
            ).map(([id, labelText, Icon]) => (
              <button
                key={id}
                type="button"
                aria-label={labelText}
                aria-pressed={view === id}
                onClick={() => handleViewChange(id)}
                className={cn(
                  "relative grid size-7 cursor-pointer place-items-center rounded-[9px] outline-none transition-colors sm:size-8",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  view === id ? "text-ink" : "text-ink-2 hover:text-ink"
                )}
              >
                <Icon className="size-3.5 sm:size-4" strokeWidth={1.8} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Animation Stage: Fixed height, zero layout reflow */}
      <div
        ref={stageRef}
        role="group"
        aria-label={label}
        onKeyDown={onStageKey}
        className="relative touch-manipulation select-none"
        style={{ height: H }}
      >
        {ready &&
          items.map((it, i) => {
            const col = model.columns[i];
            const row = model.rows[i];
            const s = view === "columns" ? col : row;
            const isSel = i === selIndex;
            const toRows = view === "rows";
            const tone = resolveTone(it.tone);

            const thumbX = toRows ? s.x + 10 : s.x + (s.w - THUMB) / 2;
            const thumbY = toRows ? s.y + (s.h - THUMB) / 2 : s.y + 10;

            const total = model.totals[i];
            const rsv = model.reserves[i];
            const hasRsv = rsv > 0 && total > 0;
            const rsvRatio = hasRsv ? rsv / total : 0;

            // In columns, reserve is at the top cap. In rows, reserve is at the right edge.
            const rsvColH = Math.round(s.h * rsvRatio);
            const rsvRowW = Math.round(s.w * rsvRatio);

            return (
              <motion.button
                key={it.id}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                aria-pressed={isSel}
                aria-label={`${it.name}, ${formatVal(total)}, ${Math.round(
                  (total / model.grandTotal) * 100
                )} percent`}
                tabIndex={isSel ? 0 : -1}
                onClick={() => setSelectedId(it.id)}
                className="absolute cursor-pointer bg-transparent outline-none [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-primary"
                style={{ left: -PAD, top: -PAD, width: width + PAD * 2, height: H + PAD * 2 }}
                initial={false}
                animate={{ clipPath: inset(s, width, H, 3) }}
                transition={move(i)}
              >
                {/* Surface base */}
                <motion.span
                  aria-hidden
                  className="absolute inset-0"
                  style={{ backgroundColor: tone.bg }}
                  initial={false}
                  animate={{ clipPath: inset(s, width, H, 1) }}
                  transition={move(i)}
                />

                {/* Hatched reserve overlay */}
                {hasRsv && (
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.08)",
                      backgroundImage:
                        "repeating-linear-gradient(135deg, rgba(15, 15, 20, 0.42) 0px, rgba(15, 15, 20, 0.42) 3px, transparent 3px, transparent 7.5px)",
                      clipPath: toRows
                        ? inset(
                            { x: s.x + s.w - rsvRowW, y: s.y, w: rsvRowW, h: s.h, r: s.r },
                            width,
                            H,
                            1
                          )
                        : inset({ x: s.x, y: s.y, w: s.w, h: rsvColH, r: s.r }, width, H, 1),
                    }}
                    initial={false}
                    animate={{
                      clipPath: toRows
                        ? inset(
                            { x: s.x + s.w - rsvRowW, y: s.y, w: rsvRowW, h: s.h, r: s.r },
                            width,
                            H,
                            1
                          )
                        : inset({ x: s.x, y: s.y, w: s.w, h: rsvColH, r: s.r }, width, H, 1),
                    }}
                    transition={move(i)}
                  />
                )}

                {/* Photo thumbnail */}
                <motion.span
                  aria-hidden
                  className={cn(
                    "absolute top-0 left-0 block overflow-hidden transition-[box-shadow] duration-200",
                    isSel ? "ring-2 ring-neutral-950 ring-offset-1 ring-offset-white" : "ring-1 ring-black/15 shadow-2xs"
                  )}
                  style={{ width: THUMB, height: THUMB }}
                  initial={false}
                  animate={{
                    x: thumbX + PAD,
                    y: thumbY + PAD,
                    borderRadius: toRows ? 10 : THUMB / 2,
                  }}
                  transition={move(i)}
                >
                  <img
                    src={it.photo}
                    alt=""
                    draggable={false}
                    className="size-full object-cover"
                  />
                </motion.span>

                {/* Rows view: Name & detail on left, value and tonal share pill on right */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute top-0 left-0 flex items-center justify-between gap-3 pr-4 pl-[56px] text-[14.5px] text-neutral-950"
                  style={{ width: width, height: model.rowH }}
                  initial={false}
                  animate={{ x: PAD, y: row.y + PAD, opacity: toRows ? 1 : 0 }}
                  transition={{ default: move(i), opacity: fade(toRows, i) }}
                >
                  <span className="flex min-w-0 items-baseline gap-2 truncate">
                    <span className="truncate font-bold text-neutral-950">{it.name}</span>
                    {it.detail && (
                      <span className="hidden truncate text-[12px] font-medium text-neutral-700 sm:inline">
                        · {it.detail}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="font-bold tabular-nums text-neutral-950">{formatVal(total)}</span>
                    <span
                      className="inline-flex min-w-9 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums shadow-xs"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.92)",
                        color: "#111111",
                        border: "1px solid rgba(0, 0, 0, 0.16)",
                      }}
                    >
                      {Math.round((total / model.grandTotal) * 100)}%
                    </span>
                  </span>
                </motion.span>

                {/* Columns view: Value at the foot of the bar */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute top-0 left-0 flex items-center justify-center"
                  style={{ width: model.colW, height: 34 }}
                  initial={false}
                  animate={{
                    x: col.x + PAD,
                    y: col.y + col.h - 34 + PAD,
                    opacity: toRows ? 0 : 1,
                  }}
                  transition={{ default: move(i), opacity: fade(!toRows, i) }}
                >
                  <span className="rounded-md border border-black/12 bg-white/92 px-1.5 py-0.5 text-[11.5px] font-bold tabular-nums text-neutral-950 shadow-2xs backdrop-blur-xs">
                    {formatVal(total)}
                  </span>
                </motion.span>
              </motion.button>
            );
          })}
      </div>

      {/* Selected Item Detail Inspection Tray */}
      <div className="mt-4 min-h-[4.25rem] border-t border-line pt-3" aria-live="polite">
        <motion.div
          key={`${selected.id}-${activeMetricId}-${showReserve}`}
          initial={still ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={still ? { duration: 0 } : { duration: 0.25, ease: "easeOut" }}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <p className="text-[15px] font-bold text-ink">
              {selected.name}
              {selected.detail && (
                <span className="font-normal text-ink-2"> · {selected.detail}</span>
              )}
            </p>
            <p className="text-[13px] font-medium text-ink-2">
              <span className="font-bold tabular-nums text-ink">
                {formatVal(model.totals[selIndex])}
              </span>
              {model.reserves[selIndex] > 0 && (
                <span className="text-ink-2">
                  {" "}({formatVal(model.primaries[selIndex])} base + {formatVal(model.reserves[selIndex])} reserve)
                </span>
              )}
              <span className="text-ink-2 font-semibold"> · {share}% of total</span>
            </p>
          </div>
          {selected.note && (
            <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-ink">
              {selected.note}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
