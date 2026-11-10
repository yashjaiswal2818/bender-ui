"use client";

import React, { useMemo, useState } from "react";
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
import { SkyOrb, type SkyWeather } from "./sky-orb";
import { resolveSolarTelemetry } from "./sky-engine";

interface CityPreset {
  id: "dawn" | "midday" | "dusk" | "night";
  phaseTitle: string;
  city: string;
  shortCity?: string;
  timezone: string;
  hour: number;
  minute: number;
  defaultWeather: SkyWeather;
  teammateName: string;
}

const CITY_PRESETS: readonly CityPreset[] = [
  {
    id: "dawn",
    phaseTitle: "Dawn",
    city: "Tokyo",
    timezone: "Asia/Tokyo",
    hour: 5,
    minute: 45,
    defaultWeather: "clear",
    teammateName: "Kenji Takahashi",
  },
  {
    id: "midday",
    phaseTitle: "Midday",
    city: "San Francisco",
    shortCity: "SF",
    timezone: "America/Los_Angeles",
    hour: 12,
    minute: 30,
    defaultWeather: "clear",
    teammateName: "Elena Rostova",
  },
  {
    id: "dusk",
    phaseTitle: "Dusk",
    city: "Lisbon",
    timezone: "Europe/Lisbon",
    hour: 18,
    minute: 45,
    defaultWeather: "clear",
    teammateName: "Maren Vestergaard",
  },
  {
    id: "night",
    phaseTitle: "Night",
    city: "Reykjavik",
    timezone: "Atlantic/Reykjavik",
    hour: 23,
    minute: 50,
    defaultWeather: "rain",
    teammateName: "Soren Lindqvist",
  },
] as const;

const WEATHER_OPTIONS: readonly {
  id: SkyWeather;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "clear", label: "Clear sky", icon: Sun },
  { id: "clouds", label: "Clouds", icon: Cloud },
  { id: "rain", label: "Rain", icon: CloudRain },
  { id: "fog", label: "Fog", icon: CloudFog },
  { id: "snow", label: "Snow", icon: Snowflake },
] as const;

function buildDateForZoneTime(
  timezone: string,
  targetHour: number,
  targetMinute: number
): Date {
  const baseUtc = Date.UTC(2025, 4, 15, targetHour, targetMinute, 0);
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date(baseUtc));

    let reportedH = 0;
    let reportedM = 0;
    for (const p of parts) {
      if (p.type === "hour") reportedH = Number.parseInt(p.value, 10) % 24;
      if (p.type === "minute") reportedM = Number.parseInt(p.value, 10);
    }

    const desiredMinutes = targetHour * 60 + targetMinute;
    const actualMinutes = reportedH * 60 + reportedM;
    let diffMinutes = desiredMinutes - actualMinutes;
    if (diffMinutes > 720) diffMinutes -= 1440;
    if (diffMinutes < -720) diffMinutes += 1440;

    return new Date(baseUtc + diffMinutes * 60 * 1000);
  } catch {
    return new Date(baseUtc);
  }
}

function PhaseIcon({ id }: { id: CityPreset["id"] }) {
  switch (id) {
    case "dawn":
      return <Sunrise className="h-3.5 w-3.5 text-rose-400" />;
    case "midday":
      return <Sun className="h-3.5 w-3.5 text-amber-400" />;
    case "dusk":
      return <Sunset className="h-3.5 w-3.5 text-orange-400" />;
    case "night":
      return <Moon className="h-3.5 w-3.5 text-indigo-400" />;
  }
}

export default function SkyOrbDemo() {
  const [selectedPresetId, setSelectedPresetId] =
    useState<CityPreset["id"]>("dusk");
  const [weather, setWeather] = useState<SkyWeather>("clear");
  const [customMinutes, setCustomMinutes] = useState<number>(18 * 60 + 45);

  const activePreset = useMemo(
    () =>
      CITY_PRESETS.find((p) => p.id === selectedPresetId) ?? CITY_PRESETS[2],
    [selectedPresetId]
  );

  const handleSelectPreset = (preset: CityPreset) => {
    setSelectedPresetId(preset.id);
    setWeather(preset.defaultWeather);
    setCustomMinutes(preset.hour * 60 + preset.minute);
  };

  const activeHour = Math.floor(customMinutes / 60) % 24;
  const activeMinute = customMinutes % 60;

  const syntheticTime = useMemo(
    () =>
      buildDateForZoneTime(activePreset.timezone, activeHour, activeMinute),
    [activePreset.timezone, activeHour, activeMinute]
  );

  const telemetry = useMemo(
    () =>
      resolveSolarTelemetry({
        timezone: activePreset.timezone,
        time: syntheticTime,
        weather,
      }),
    [activePreset.timezone, syntheticTime, weather]
  );

  return (
    <div className="grid grid-cols-1 items-center gap-8 rounded-[20px] border border-line bg-surface px-6 py-9 sm:px-10 sm:py-11 md:grid-cols-[1fr_228px] md:gap-10">
      {/* Center Focal Stage */}
      <div className="flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute -inset-10 rounded-full opacity-35 blur-2xl transition-colors duration-700",
              telemetry.phaseLabel === "Dawn" && "bg-rose-400/55",
              telemetry.phaseLabel === "Midday" && "bg-sky-400/55",
              telemetry.phaseLabel === "Golden Hour" && "bg-orange-400/60",
              telemetry.phaseLabel === "Night" && "bg-indigo-500/50"
            )}
          />

          <SkyOrb
            timezone={activePreset.timezone}
            time={syntheticTime}
            weather={weather}
            name={activePreset.teammateName}
            location={activePreset.city}
            size={188}
            showPopover={true}
          />
        </div>

        <div className="mt-6 text-center">
          <div className="font-display text-xl font-semibold tracking-tight tabular-nums text-ink">
            {telemetry.clockHM} · {telemetry.phaseLabel}
          </div>
          <p className="mt-1 text-[13px] text-ink-3">
            {activePreset.city} · {telemetry.weatherLabel}
          </p>
        </div>

        {/* Hairline 24h Solar Scrubber */}
        <input
          type="range"
          min={0}
          max={1439}
          step={5}
          aria-label="Scrub solar time across 24 hours"
          value={customMinutes}
          onChange={(e) => setCustomMinutes(Number(e.target.value))}
          className="mt-5 h-1 w-48 cursor-pointer appearance-none rounded-full bg-line-2 accent-primary"
        />
      </div>

      {/* Quiet Side Controls */}
      <div className="flex w-full flex-col gap-5">
        {/* Time / Phase Forms */}
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">
          {CITY_PRESETS.map((preset) => {
            const isSelected =
              selectedPresetId === preset.id &&
              Math.abs(customMinutes - (preset.hour * 60 + preset.minute)) <=
                15;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={cn(
                  "flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] transition-colors",
                  isSelected
                    ? "bg-tile text-ink ring-1 ring-line-2"
                    : "text-ink-2 hover:bg-tile/60 hover:text-ink"
                )}
              >
                <span className="inline-flex items-center gap-2 font-medium">
                  <PhaseIcon id={preset.id} />
                  {preset.phaseTitle}
                </span>
                <span className="truncate text-[12px] text-ink-3">
                  {preset.shortCity ? (
                    <>
                      <span className="md:hidden">{preset.shortCity}</span>
                      <span className="hidden md:inline">{preset.city}</span>
                    </>
                  ) : (
                    preset.city
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Weather Icon Switcher */}
        <div
          role="group"
          aria-label="Weather"
          className="grid grid-cols-5 rounded-xl border border-line bg-tile p-1"
        >
          {WEATHER_OPTIONS.map((item) => {
            const Icon = item.icon;
            const active = weather === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.label}
                aria-pressed={active}
                title={item.label}
                onClick={() => setWeather(item.id)}
                className={cn(
                  "grid h-8 cursor-pointer place-items-center rounded-lg transition-colors",
                  active
                    ? "bg-surface text-ink ring-1 ring-line-2 shadow-2xs"
                    : "text-ink-3 hover:text-ink"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
        </div>

        {/* Real 36px Avatar Scale Preview */}
        <div className="flex items-center gap-3 border-t border-line pt-4">
          <SkyOrb
            timezone={activePreset.timezone}
            time={syntheticTime}
            weather={weather}
            name={activePreset.teammateName}
            location={activePreset.city}
            size={36}
            showPopover={true}
          />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-ink">
              {activePreset.teammateName}
            </div>
            <div className="truncate text-[12px] text-ink-3">
              {activePreset.city} · {telemetry.clockHM}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
