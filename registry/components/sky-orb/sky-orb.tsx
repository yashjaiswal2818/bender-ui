"use client";
/* eslint-disable @next/next/no-img-element -- plain <img> so the component runs in any React app */

import React, { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Cloud,
  CloudFog,
  CloudRain,
  Moon,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createSkyEngine,
  resolveCoreSize,
  resolveSolarTelemetry,
  type SkyAvailability,
  type SkyEngineController,
  type SkyWeather as EngineSkyWeather,
} from "./sky-engine";

/**
 * Supported atmospheric weather states for the procedural micro-sky.
 */
export type SkyWeather = EngineSkyWeather;

/**
 * Display size variant preset token ("sm": 32px, "md": 40px, "lg": 48px, "xl": 180px)
 * or an explicit numeric pixel diameter (e.g. `size={180}` or `size={36}`).
 */
export type SkyOrbSize = "sm" | "md" | "lg" | "xl" | number;

/**
 * Props for the `SkyOrb` optical porthole avatar badge and timezone presence indicator.
 */
export interface SkyOrbProps {
  /** IANA Timezone string, e.g. "Europe/Lisbon", "Asia/Tokyo", "America/New_York" */
  timezone: string;
  /** Optional manual time override as ISO string or Date (defaults to real-time clock) */
  time?: Date | string;
  /** Weather condition driving cloud cover and precipitation particles */
  weather?: SkyWeather;
  /** Teammate's display name */
  name?: string;
  /** Teammate's current role, desk, or city */
  location?: string;
  /** User availability status override (auto-computed from local hour if omitted) */
  status?: "available" | "away" | "busy" | "offline";
  /** Optional custom avatar photo overlay inside the orb or beside it */
  avatarSrc?: string;
  /** Display size variant (default: "md") */
  size?: SkyOrbSize;
  /** Whether to show the hover timecard popover (default: true) */
  showPopover?: boolean;
  /** Additional CSS class names */
  className?: string;
}

const SIZE_MAP: Record<"sm" | "md" | "lg" | "xl", number> = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 180,
};

/**
 * Converts a `SkyOrbSize` token or numeric value into a concrete pixel diameter.
 */
export function resolveOrbPixelSize(size: SkyOrbSize = "md"): number {
  if (typeof size === "number") {
    return Math.max(24, Math.min(360, Math.round(size)));
  }
  return SIZE_MAP[size] ?? 40;
}

const STATUS_DOT_STYLES: Record<
  SkyAvailability,
  { bg: string; ring: string; badgeBg: string; badgeText: string }
> = {
  available: {
    bg: "bg-emerald-500",
    ring: "shadow-[0_0_8px_rgba(16,185,129,0.65)]",
    badgeBg: "bg-emerald-500/12 border-emerald-500/30",
    badgeText: "text-emerald-500",
  },
  away: {
    bg: "bg-amber-400",
    ring: "shadow-[0_0_8px_rgba(245,158,11,0.55)]",
    badgeBg: "bg-amber-500/12 border-amber-500/30",
    badgeText: "text-amber-500",
  },
  busy: {
    bg: "bg-rose-500",
    ring: "shadow-[0_0_8px_rgba(244,63,94,0.6)]",
    badgeBg: "bg-rose-500/12 border-rose-500/30",
    badgeText: "text-rose-500",
  },
  offline: {
    bg: "bg-slate-400",
    ring: "shadow-none",
    badgeBg: "bg-slate-500/12 border-slate-500/25",
    badgeText: "text-(--ink-2,#525252)",
  },
};

function WeatherGlyph({
  weather,
  isNight,
  className,
}: {
  weather: SkyWeather;
  isNight: boolean;
  className?: string;
}) {
  switch (weather) {
    case "rain":
      return <CloudRain className={cn("h-4 w-4 text-sky-400", className)} />;
    case "clouds":
      return <Cloud className={cn("h-4 w-4 text-slate-400", className)} />;
    case "fog":
      return <CloudFog className={cn("h-4 w-4 text-teal-400", className)} />;
    case "snow":
      return <Snowflake className={cn("h-4 w-4 text-cyan-300", className)} />;
    case "clear":
    default:
      return isNight ? (
        <Moon className={cn("h-4 w-4 text-indigo-300", className)} />
      ) : (
        <Sun className={cn("h-4 w-4 text-amber-400", className)} />
      );
  }
}

/**
 * SkyOrb — Ambient optical porthole avatar badge and timezone presence indicator.
 * Renders a living, procedural, 4x4 Bayer-dithered micro-sky reflecting a teammate's
 * real-time local solar hour, celestial trajectory, weather particles, and availability.
 */
export function SkyOrb({
  timezone,
  time,
  weather = "clear",
  name = "Remote Teammate",
  location,
  status,
  avatarSrc,
  size = "md",
  showPopover = true,
  className,
}: SkyOrbProps) {
  const sizePx = resolveOrbPixelSize(size);
  const coreSize = resolveCoreSize(sizePx);
  const isShowcase = sizePx >= 96;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<SkyEngineController | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  const [isOpen, setIsOpen] = useState(false);
  const [pinnedByClick, setPinnedByClick] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("top");
  const [horizAlign, setHorizAlign] = useState<"center" | "left" | "right">(
    "center"
  );
  const [liveNow, setLiveNow] = useState<Date | undefined>(() =>
    time ? undefined : new Date()
  );

  // Live clock tick when `time` prop is not manually locked
  useEffect(() => {
    if (time !== undefined) {
      setLiveNow(undefined);
      return;
    }
    setLiveNow(new Date());
    const interval = window.setInterval(() => {
      setLiveNow(new Date());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [time]);

  const effectiveTime = time ?? liveNow;

  const telemetry = resolveSolarTelemetry({
    timezone,
    time: effectiveTime,
    weather,
    statusOverride: status,
  });

  // Mount and synchronize offscreen procedural canvas engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const controller = createSkyEngine(
      canvas,
      {
        timezone,
        time: effectiveTime,
        weather,
        dayOfMonth: telemetry.dayOfMonth,
      },
      coreSize
    );
    engineRef.current = controller;

    return () => {
      controller.destroy();
      engineRef.current = null;
    };
    // Only recreate engine when canvas resolution changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreSize]);

  useEffect(() => {
    engineRef.current?.updateConfig({
      timezone,
      time: effectiveTime,
      weather,
      dayOfMonth: telemetry.dayOfMonth,
    });
  }, [timezone, effectiveTime, weather, telemetry.dayOfMonth]);

  // Collision-aware floating popover placement calculation
  const updateFloatingPlacement = () => {
    const el = wrapperRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    setPlacement(spaceAbove < 170 && spaceBelow > spaceAbove ? "bottom" : "top");

    const centerX = rect.left + rect.width / 2;
    if (centerX < 150) {
      setHorizAlign("left");
    } else if (window.innerWidth - centerX < 150) {
      setHorizAlign("right");
    } else {
      setHorizAlign("center");
    }
  };

  const handleOpen = () => {
    if (!showPopover) return;
    updateFloatingPlacement();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (pinnedByClick) return;
    setIsOpen(false);
  };

  // Close on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPinnedByClick(false);
        setIsOpen(false);
      }
    };
    const onPointerDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setPinnedByClick(false);
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!showPopover) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      updateFloatingPlacement();
      setPinnedByClick((prev) => {
        const next = !prev;
        setIsOpen(next);
        return next;
      });
    } else if (e.key === "Escape") {
      setPinnedByClick(false);
      setIsOpen(false);
    }
  };

  // Proportional bezel & optical lens geometry
  const bezelWidth = Math.max(
    1.5,
    Math.min(6, Math.round(sizePx * 0.045 * 2) / 2)
  );
  const pipSize = isShowcase
    ? Math.round(sizePx * 0.1)
    : sizePx <= 34
      ? 7
      : sizePx <= 42
        ? 8
        : 9;
  const pipBorder = isShowcase ? 3 : 1.5;

  const displayLocation =
    location ?? timezone.split("/").pop()?.replace(/_/g, " ") ?? timezone;
  const ariaDescription = `${name}'s local time: ${telemetry.clockHM}, ${telemetry.weatherLabel} in ${displayLocation}`;
  const isNight =
    telemetry.solarHour < 5.5 || telemetry.solarHour >= 19.5;
  const dotStyle = STATUS_DOT_STYLES[telemetry.status];

  return (
    <div
      ref={wrapperRef}
      className={cn("relative inline-flex items-center justify-center select-none", className)}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
    >
      {/* Interactive Porthole Trigger */}
      <motion.div
        role="button"
        tabIndex={0}
        aria-label={ariaDescription}
        aria-expanded={showPopover ? isOpen : undefined}
        aria-controls={showPopover && isOpen ? popoverId : undefined}
        onFocus={handleOpen}
        onBlur={handleClose}
        onClick={() => {
          if (!showPopover) return;
          updateFloatingPlacement();
          setPinnedByClick((prev) => {
            const next = !prev;
            setIsOpen(next);
            return next;
          });
        }}
        onKeyDown={handleKeyDown}
        whileHover={{ scale: 1.08 }}
        whileFocus={{ scale: 1.08 }}
        transition={{ type: "spring", stiffness: 380, damping: 25 }}
        style={{
          width: sizePx,
          height: sizePx,
          padding: bezelWidth,
          background:
            "linear-gradient(155deg, rgba(255,255,255,0.88) 0%, rgba(198,203,214,0.75) 38%, rgba(120,126,142,0.82) 72%, rgba(52,56,68,0.94) 100%)",
          boxShadow: isShowcase
            ? "0 22px 48px -12px rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.22), inset 0 1.5px 1px rgba(255,255,255,0.75), inset 0 -2px 2px rgba(0,0,0,0.35)"
            : "0 4px 10px -2px rgba(0,0,0,0.3), inset 0 1px 0.5px rgba(255,255,255,0.75), inset 0 -1px 1px rgba(0,0,0,0.35)",
        }}
        className="group relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary,#0284c7) focus-visible:ring-offset-2"
      >
        {/* Inner Porthole Aperture & Convex Droplet Glass Lens */}
        <div className="relative h-full w-full overflow-hidden rounded-full bg-slate-950">
          {/* Procedural Dithered Micro-Sky Canvas */}
          <canvas
            ref={canvasRef}
            width={coreSize}
            height={coreSize}
            style={{ imageRendering: "pixelated" }}
            className="pixelated-canvas block h-full w-full rounded-full object-cover"
          />

          {/* Optional Custom Avatar Photo Overlay inside lower rim */}
          {avatarSrc && (
            <img
              src={avatarSrc}
              alt={name}
              className="pointer-events-none absolute inset-0 h-full w-full rounded-full object-cover opacity-35 mix-blend-luminosity transition-opacity duration-300 group-hover:opacity-15"
            />
          )}

          {/* Convex Glass Perimeter Inset Occlusion Shadow */}
          <div
            aria-hidden="true"
            style={{
              boxShadow: isShowcase
                ? "inset 0 6px 14px rgba(0,0,0,0.46), inset 0 -6px 12px rgba(0,0,0,0.38), inset 0 0 0 1.5px rgba(255,255,255,0.16)"
                : "inset 0 2px 5px rgba(0,0,0,0.44), inset 0 -1.5px 3px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.15)",
            }}
            className="pointer-events-none absolute inset-0 rounded-full"
          />

          {/* Primary Top-Left Elliptical Specular Catch-Light Arc (-35deg) */}
          <div
            aria-hidden="true"
            style={{
              width: "54%",
              height: "24%",
              top: "7%",
              left: "11%",
              transform: "rotate(-35deg)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.68) 0%, rgba(255,255,255,0.16) 65%, rgba(255,255,255,0) 100%)",
              filter: isShowcase ? "blur(0.6px)" : "none",
            }}
            className="pointer-events-none absolute rounded-full"
          />

          {/* Secondary Pinpoint Mineral Crystal Glint */}
          <div
            aria-hidden="true"
            style={{
              width: "11%",
              height: "7%",
              top: "27%",
              left: "13%",
              transform: "rotate(-35deg)",
              background: "rgba(255,255,255,0.45)",
            }}
            className="pointer-events-none absolute rounded-full"
          />

          {/* Subtle Bottom-Right Curved Rim Caustic Bounce */}
          <div
            aria-hidden="true"
            style={{
              width: "62%",
              height: "20%",
              bottom: "4%",
              right: "8%",
              transform: "rotate(-28deg)",
              background:
                "radial-gradient(ellipse at center, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 75%)",
            }}
            className="pointer-events-none absolute rounded-full"
          />
        </div>

        {/* Availability Indicator Pip Docked at Bottom-Right of Bezel */}
        <span
          aria-hidden="true"
          style={{
            width: pipSize,
            height: pipSize,
            borderWidth: pipBorder,
            bottom: isShowcase ? "4%" : -1,
            right: isShowcase ? "4%" : -1,
          }}
          className={cn(
            "pointer-events-none absolute rounded-full border-(--surface,#ffffff) transition-colors duration-300",
            dotStyle.bg,
            dotStyle.ring
          )}
        />
      </motion.div>

      {/* Floating Timecard Popover */}
      <AnimatePresence>
        {showPopover && isOpen && (
          <motion.div
            id={popoverId}
            role="dialog"
            aria-label={`${name} timecard telemetry`}
            initial={{
              opacity: 0,
              y: placement === "top" ? 6 : -6,
              scale: 0.95,
            }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{
              opacity: 0,
              y: placement === "top" ? 5 : -5,
              scale: 0.96,
            }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className={cn(
              "pointer-events-auto absolute z-50 w-[276px] rounded-[20px] border border-(--line,rgba(0,0,0,0.1)) bg-(--surface,#ffffff) p-3.5 text-(--ink,#171717) shadow-xl",
              placement === "top" ? "bottom-full mb-2.5" : "top-full mt-2.5",
              horizAlign === "center" && "left-1/2 -translate-x-1/2",
              horizAlign === "left" && "left-0",
              horizAlign === "right" && "right-0"
            )}
          >
            {/* Top Row: Teammate Name + Location / Timezone Abbreviation */}
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-semibold text-(--ink,#171717)">{name}</span>
              <span className="shrink-0 font-mono text-[11px] text-(--ink-2,#525252)">
                {displayLocation} · {telemetry.tzAbbrev}
              </span>
            </div>

            {/* Hero Row: Large Tabular Digital Clock + Weather Glyph & Condition */}
            <div className="mt-2 flex items-center justify-between gap-2 border-y border-(--line,rgba(0,0,0,0.1)) py-2.5">
              <div className="font-mono text-2xl font-semibold tracking-tight tabular-nums text-(--ink,#171717)">
                {telemetry.clockHMS}
              </div>
              <div className="flex items-center gap-1.5 text-right text-[11.5px] font-medium text-(--ink-2,#525252)">
                <WeatherGlyph weather={weather} isNight={isNight} className="shrink-0" />
                <span className="tabular-nums">
                  {telemetry.temperatureC}°C · {telemetry.weatherLabel}
                </span>
              </div>
            </div>

            {/* Bottom Row: Working Status Badge + Local Sunrise/Sunset Milestones */}
            <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px]">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium",
                  dotStyle.badgeBg,
                  dotStyle.badgeText
                )}
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", dotStyle.bg)}
                />
                {telemetry.statusLabel}
              </span>

              <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-(--ink-2,#525252)">
                <span
                  className="inline-flex items-center gap-0.5"
                  title="Local Sunrise"
                >
                  <Sunrise className="h-3 w-3 text-amber-500" />
                  {telemetry.sunriseTime}
                </span>
                <span
                  className="inline-flex items-center gap-0.5"
                  title="Local Sunset"
                >
                  <Sunset className="h-3 w-3 text-orange-500" />
                  {telemetry.sunsetTime}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SkyOrb;
