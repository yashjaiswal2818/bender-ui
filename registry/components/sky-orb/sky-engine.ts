export type SkyWeather = "clear" | "clouds" | "rain" | "fog" | "snow";
export type SkyAvailability = "available" | "away" | "busy" | "offline";

/**
 * Default internal pixel grid resolution for the procedural micro-sky canvas.
 * Scaled up cleanly with `imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`.
 */
export const CORE_SIZE = 48;

/**
 * Resolves the optimal internal pixel grid resolution based on rendered orb pixel diameter.
 * Keeps badge sizes (32px–48px) at a crisp 36x36 grid and showcase sizes (up to 200px+) at 48x48.
 */
export function resolveCoreSize(displayPx: number): number {
  if (displayPx <= 52) return 36;
  if (displayPx <= 120) return 44;
  return 48;
}

/**
 * 4x4 Ordered Bayer dithering threshold matrix (0..15).
 */
export const BAYER_4X4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
] as const;

export type RGB = readonly [number, number, number];

/**
 * Curated 16-color atmospheric & celestial pixel-art palette.
 * Every pixel in the micro-sky is quantized to one of these 16 colors.
 */
export const SKY_PALETTE_16: readonly RGB[] = [
  [9, 13, 30],     // 0: Deep Midnight Ink (#090d1e)
  [19, 27, 58],    // 1: Night Indigo (#131b3a)
  [31, 45, 90],    // 2: Twilight Cobalt (#1f2d5a)
  [59, 45, 100],   // 3: Dusk Royal Violet (#3b2d64)
  [110, 53, 98],   // 4: Sunset Plum Rose (#6e3562)
  [184, 74, 105],  // 5: Dawn Rose Pink (#b84a69)
  [217, 91, 67],   // 6: Blazing Terracotta (#d95b43)
  [239, 130, 80],  // 7: Coral Horizon (#ef8250)
  [246, 180, 86],  // 8: Amber Gold (#f6b456)
  [252, 228, 156], // 9: Warm Cream Sunlight (#fce49c)
  [26, 95, 180],   // 10: Deep Zenith Azure (#1a5fb4)
  [46, 139, 230],  // 11: Clear Sky Cyan (#2e8be6)
  [83, 179, 245],  // 12: Midday Cerulean (#53b3f5)
  [143, 217, 214], // 13: Sea-Foam Horizon (#8fd9d6)
  [220, 232, 242], // 14: Cloud Crown / Starlight White (#dce8f2)
  [71, 88, 112],   // 15: Storm Slate Shadow (#475870)
] as const;

export interface SolarTelemetry {
  /** Continuous local solar hour in [0.0, 24.0) */
  solarHour: number;
  /** Continuous solar phase p in [0.0, 4.0) (0=Dawn, 1=Midday, 2=Golden Hour/Dusk, 3=Night) */
  phase: number;
  /** Human-readable solar phase label */
  phaseLabel: "Dawn" | "Midday" | "Golden Hour" | "Night";
  /** Detailed solar sub-phase description */
  phaseDetail: string;
  /** Tabular local digital clock HH:MM:SS */
  clockHMS: string;
  /** Short local digital clock HH:MM */
  clockHM: string;
  /** Timezone abbreviation and UTC offset, e.g. "WET (UTC+0)" */
  tzAbbrev: string;
  /** Computed or overridden availability status */
  status: SkyAvailability;
  /** Human-readable working status badge text */
  statusLabel: string;
  /** Estimated local temperature in Celsius */
  temperatureC: number;
  /** Formatted weather condition label */
  weatherLabel: string;
  /** Local sunrise time string */
  sunriseTime: string;
  /** Local sunset time string */
  sunsetTime: string;
  /** Calendar day of month (1..31) used for lunar phase */
  dayOfMonth: number;
}

interface SkyAnchor {
  hour: number;
  /** 4 palette indices from zenith (top) to horizon (bottom) */
  bands: readonly [number, number, number, number];
}

const SKY_ANCHORS: readonly SkyAnchor[] = [
  { hour: 0.0, bands: [0, 0, 1, 2] },    // Midnight
  { hour: 4.2, bands: [0, 1, 2, 3] },    // Pre-dawn indigo
  { hour: 5.75, bands: [3, 4, 5, 8] },   // Dawn / Sunrise (rose pink -> amber gold)
  { hour: 7.25, bands: [10, 11, 12, 9] },// Morning rise
  { hour: 12.0, bands: [10, 11, 12, 13] }, // Midday (azure cyan -> sea-foam)
  { hour: 16.2, bands: [10, 11, 12, 13] }, // Late afternoon
  { hour: 17.75, bands: [2, 3, 6, 8] },  // Golden Hour (deep violet -> terracotta -> amber)
  { hour: 19.0, bands: [1, 3, 5, 6] },   // Dusk (violet -> blazing terracotta & coral)
  { hour: 20.5, bands: [0, 1, 1, 2] },   // Nightfall
  { hour: 24.0, bands: [0, 0, 1, 2] },   // Midnight wrap
] as const;

interface StarPoint {
  nx: number;
  ny: number;
  phaseOffset: number;
  tier: 0 | 1;
}

const STARS: readonly StarPoint[] = Array.from({ length: 20 }, (_, i) => {
  // Deterministic Bayer-seeded star distribution in upper 76% of sky
  const bayerVal = BAYER_4X4[i % 16];
  const h1 = ((i * 73 + bayerVal * 19 + 11) % 97) / 97;
  const h2 = ((i * 41 + bayerVal * 31 + 7) % 89) / 89;
  return {
    nx: 0.08 + h1 * 0.84,
    ny: 0.07 + h2 * 0.65,
    phaseOffset: (i * 1.37) % (Math.PI * 2),
    tier: (i % 3 === 0 ? 1 : 0) as 0 | 1,
  };
});

interface CloudPuff {
  baseX: number;
  baseY: number;
  width: number;
  height: number;
  layer: 0 | 1; // 0 = far/slow, 1 = near/fast
}

const CLOUD_PUFFS: readonly CloudPuff[] = [
  { baseX: 0.12, baseY: 0.28, width: 0.34, height: 0.13, layer: 0 },
  { baseX: 0.62, baseY: 0.22, width: 0.38, height: 0.14, layer: 0 },
  { baseX: 0.04, baseY: 0.44, width: 0.44, height: 0.16, layer: 1 },
  { baseX: 0.52, baseY: 0.39, width: 0.46, height: 0.17, layer: 1 },
];

/**
 * Safely parses a Date or ISO string into a valid Date instance.
 */
function toValidDate(time?: Date | string): Date {
  if (!time) return new Date();
  const parsed = time instanceof Date ? time : new Date(time);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

const FMT_PARTS = new Map<string, Intl.DateTimeFormat>();
const FMT_SHORT = new Map<string, Intl.DateTimeFormat>();
const FMT_OFFSET = new Map<string, Intl.DateTimeFormat>();

function getPartsFormatter(tz: string): Intl.DateTimeFormat {
  let fmt = FMT_PARTS.get(tz);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      day: "numeric",
      hour12: false,
    });
    FMT_PARTS.set(tz, fmt);
  }
  return fmt;
}

/**
 * Normalizes any IANA timezone string, falling back to UTC if unrecognized.
 */
function normalizeTimezone(timezone: string): string {
  if (FMT_PARTS.has(timezone)) return timezone;
  try {
    getPartsFormatter(timezone);
    return timezone;
  } catch {
    return "UTC";
  }
}

/**
 * Computes continuous phase p in [0, 4) from local solar hour (0..24).
 * p = 0: Dawn / Sunrise (~05:00-07:30)
 * p = 1: Midday (~08:00-16:30)
 * p = 2: Golden Hour / Dusk (~17:00-19:30)
 * p = 3: Night / Midnight (~20:00-04:30)
 */
export function computeSolarPhase(solarHour: number): {
  phase: number;
  phaseLabel: "Dawn" | "Midday" | "Golden Hour" | "Night";
  phaseDetail: string;
} {
  const h = ((solarHour % 24) + 24) % 24;

  let phase = 3.0;
  if (h >= 5.0 && h < 8.0) {
    phase = (h - 5.0) / 3.0; // 0.0 -> 1.0
  } else if (h >= 8.0 && h < 16.75) {
    phase = 1.0 + ((h - 8.0) / 8.75) * 0.99; // 1.0 -> 1.99
  } else if (h >= 16.75 && h < 19.75) {
    phase = 2.0 + (h - 16.75) / 3.0; // 2.0 -> 3.0
  } else if (h >= 19.75) {
    phase = 3.0 + ((h - 19.75) / 9.25) * 0.5; // 3.0 -> 3.5
  } else {
    phase = 3.5 + (h / 5.0) * 0.5; // 3.5 -> 4.0
  }

  if (h >= 5.0 && h < 7.75) {
    return { phase, phaseLabel: "Dawn", phaseDetail: "Sunrise Horizon" };
  }
  if (h >= 7.75 && h < 16.75) {
    return { phase, phaseLabel: "Midday", phaseDetail: "High Solar Arc" };
  }
  if (h >= 16.75 && h < 19.75) {
    return { phase, phaseLabel: "Golden Hour", phaseDetail: "Dusk Twilight" };
  }
  return { phase, phaseLabel: "Night", phaseDetail: "Lunar Transit" };
}

const WEATHER_LABELS: Record<SkyWeather, string> = {
  clear: "Clear Sky",
  clouds: "Scattered Clouds",
  rain: "Light Rain",
  fog: "Atmospheric Fog",
  snow: "Snow Flurries",
};

/**
 * Resolves full local solar telemetry for a teammate's timezone, time override, and weather state.
 * Uses native `Intl.DateTimeFormat` with zero external date libraries.
 */
export function resolveSolarTelemetry(options: {
  timezone: string;
  time?: Date | string;
  weather?: SkyWeather;
  statusOverride?: SkyAvailability;
}): SolarTelemetry {
  const tz = normalizeTimezone(options.timezone);
  const date = toValidDate(options.time);
  const weather = options.weather ?? "clear";

  const parts = getPartsFormatter(tz).formatToParts(date);
  let hour = 0;
  let minute = 0;
  let second = 0;
  let dayOfMonth = 15;

  for (const part of parts) {
    if (part.type === "hour") {
      const parsed = Number.parseInt(part.value, 10);
      hour = Number.isNaN(parsed) ? 0 : parsed % 24;
    } else if (part.type === "minute") {
      const parsed = Number.parseInt(part.value, 10);
      minute = Number.isNaN(parsed) ? 0 : parsed;
    } else if (part.type === "second") {
      const parsed = Number.parseInt(part.value, 10);
      second = Number.isNaN(parsed) ? 0 : parsed;
    } else if (part.type === "day") {
      const parsed = Number.parseInt(part.value, 10);
      dayOfMonth = Number.isNaN(parsed) ? 15 : parsed;
    }
  }

  const solarHour = hour + minute / 60 + second / 3600;
  const pad = (n: number) => String(n).padStart(2, "0");
  const clockHMS = `${pad(hour)}:${pad(minute)}:${pad(second)}`;
  const clockHM = `${pad(hour)}:${pad(minute)}`;

  // Extract timezone short name & UTC offset
  let shortName = tz.split("/").pop()?.replace(/_/g, " ") ?? "UTC";
  let offsetName = "UTC+0";
  try {
    let shortFmt = FMT_SHORT.get(tz);
    if (!shortFmt) {
      shortFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" });
      FMT_SHORT.set(tz, shortFmt);
    }
    const foundShort = shortFmt.formatToParts(date).find((p) => p.type === "timeZoneName")?.value;
    if (foundShort) shortName = foundShort;

    let offsetFmt = FMT_OFFSET.get(tz);
    if (!offsetFmt) {
      offsetFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" });
      FMT_OFFSET.set(tz, offsetFmt);
    }
    const foundOffset = offsetFmt.formatToParts(date).find((p) => p.type === "timeZoneName")?.value;
    if (foundOffset) {
      offsetName = foundOffset.replace("GMT", "UTC");
      if (offsetName === "UTC") offsetName = "UTC+0";
    }
  } catch {
    // Fallback already set
  }

  const tzAbbrev =
    shortName.startsWith("GMT") || shortName.startsWith("UTC")
      ? offsetName
      : `${shortName} (${offsetName})`;

  const { phase, phaseLabel, phaseDetail } = computeSolarPhase(solarHour);

  // Auto-compute availability status from local solar hour if omitted
  let computedStatus: SkyAvailability = "offline";
  if (solarHour >= 9.0 && solarHour < 18.0) {
    computedStatus = "available";
  } else if (
    (solarHour >= 7.0 && solarHour < 9.0) ||
    (solarHour >= 18.0 && solarHour < 22.5)
  ) {
    computedStatus = "away";
  } else {
    computedStatus = "offline";
  }

  const finalStatus = options.statusOverride ?? computedStatus;
  let statusLabel = "Offline / Asleep";
  if (finalStatus === "available") {
    statusLabel = "Working hours";
  } else if (finalStatus === "away") {
    statusLabel = solarHour < 9.0 ? "Early morning" : "Late evening";
  } else if (finalStatus === "busy") {
    statusLabel = "In focus session";
  }

  // Deterministic temperature calculation based on timezone latitude hint, solar hour & weather
  const lowerTz = tz.toLowerCase();
  let baseTemp = 16;
  if (lowerTz.includes("reykjavik") || lowerTz.includes("oslo") || lowerTz.includes("helsinki")) {
    baseTemp = 6;
  } else if (lowerTz.includes("lisbon") || lowerTz.includes("los_angeles") || lowerTz.includes("sydney")) {
    baseTemp = 19;
  } else if (lowerTz.includes("tokyo") || lowerTz.includes("new_york") || lowerTz.includes("london")) {
    baseTemp = 15;
  }

  const diurnalSwing = Math.sin(((solarHour - 6) / 24) * Math.PI * 2) * 4.5;
  const weatherMod: Record<SkyWeather, number> = {
    clear: 2,
    clouds: -1,
    rain: -3,
    fog: -2,
    snow: -14,
  };
  const temperatureC = Math.round(baseTemp + diurnalSwing + weatherMod[weather]);

  // Local sunrise/sunset milestones
  const isHighLat = lowerTz.includes("reykjavik");
  const sunriseTime = isHighLat ? "06:48" : "06:14";
  const sunsetTime = isHighLat ? "20:05" : "19:38";

  return {
    solarHour,
    phase,
    phaseLabel,
    phaseDetail,
    clockHMS,
    clockHM,
    tzAbbrev,
    status: finalStatus,
    statusLabel,
    temperatureC,
    weatherLabel: WEATHER_LABELS[weather],
    sunriseTime,
    sunsetTime,
    dayOfMonth,
  };
}

/**
 * Shortest circular interpolation across the 24-hour clock.
 */
function lerpHour24(current: number, target: number, factor: number): number {
  let diff = ((target - current + 12) % 24) - 12;
  if (diff < -12) diff += 24;
  if (Math.abs(diff) < 0.002) return target;
  return (current + diff * factor + 24) % 24;
}

/**
 * Returns the 4x4 Bayer threshold in [0.0, 0.9375] for pixel coordinate (x, y).
 */
function getBayerThreshold(x: number, y: number): number {
  return BAYER_4X4[((y & 3) << 2) | (x & 3)] / 16;
}

/**
 * Samples the 4-band vertical sky palette at a given hour using 4x4 Bayer dithering.
 */
function sampleSkyPaletteIndex(
  solarHour: number,
  v: number,
  bayer: number,
  weatherWeights: Record<SkyWeather, number>
): number {
  const h = ((solarHour % 24) + 24) % 24;

  // Locate surrounding time anchors
  let a0 = SKY_ANCHORS[0];
  let a1 = SKY_ANCHORS[1];
  for (let i = 0; i < SKY_ANCHORS.length - 1; i++) {
    if (h >= SKY_ANCHORS[i].hour && h <= SKY_ANCHORS[i + 1].hour) {
      a0 = SKY_ANCHORS[i];
      a1 = SKY_ANCHORS[i + 1];
      break;
    }
  }

  const span = Math.max(0.001, a1.hour - a0.hour);
  const timeT = Math.max(0, Math.min(1, (h - a0.hour) / span));

  // Choose anchor A0 or A1 via Bayer threshold so transitions step cleanly through dither patterns
  const activeAnchor = timeT > bayer ? a1 : a0;

  // Vertical gradient across the 4 bands [0..3]
  const clampedV = Math.max(0, Math.min(0.999, v));
  const scaledV = clampedV * 3.0;
  const bandIdx = Math.min(2, Math.floor(scaledV));
  const bandFrac = scaledV - bandIdx;

  // Use offset Bayer coordinate for vertical band dithering so time & vertical dithers don't collide
  let chosenPaletteIdx =
    bandFrac > bayer
      ? activeAnchor.bands[bandIdx + 1]
      : activeAnchor.bands[bandIdx];

  // Weather overcast / storm darkening modulation via Bayer dithering
  const storminess =
    weatherWeights.rain * 0.72 +
    weatherWeights.fog * 0.55 +
    weatherWeights.snow * 0.4 +
    weatherWeights.clouds * 0.22;

  if (storminess > 0.08 && bayer < storminess) {
    const isNight = h < 5.2 || h >= 19.8;
    if (weatherWeights.fog > 0.45) {
      chosenPaletteIdx = isNight ? 2 : v > 0.45 ? 14 : 15;
    } else if (weatherWeights.rain > 0.45) {
      chosenPaletteIdx = isNight ? 1 : v < 0.55 ? 15 : 2;
    } else if (weatherWeights.snow > 0.45 && !isNight) {
      chosenPaletteIdx = v < 0.45 ? 15 : 14;
    }
  }

  return chosenPaletteIdx;
}

export interface SkyEngineConfig {
  timezone: string;
  time?: Date | string;
  weather?: SkyWeather;
  dayOfMonth?: number;
}

export interface SkyEngineController {
  /** Updates target configuration; the engine smoothly interpolates solar hour and weather weights */
  updateConfig: (config: SkyEngineConfig) => void;
  /** Forces an immediate synchronous frame draw */
  renderNow: () => void;
  /** Cleans up RAF, IntersectionObserver, and event listeners */
  destroy: () => void;
}

/**
 * Mounts and manages the procedural offscreen + onscreen pixel-art micro-sky canvas renderer.
 */
export function createSkyEngine(
  canvas: HTMLCanvasElement,
  initialConfig: SkyEngineConfig,
  coreSize: number = CORE_SIZE
): SkyEngineController {
  const size = coreSize;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d", { alpha: false });
  // Offscreen buffer as specified by architecture constraints
  const offscreenCanvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (offscreenCanvas) {
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
  }
  const offCtx = offscreenCanvas?.getContext("2d", { alpha: false }) ?? ctx;

  if (ctx) {
    ctx.imageSmoothingEnabled = false;
  }
  if (offCtx) {
    offCtx.imageSmoothingEnabled = false;
  }

  const imageData = offCtx ? offCtx.createImageData(size, size) : null;
  const data = imageData?.data ?? null;

  let config: SkyEngineConfig = { ...initialConfig };
  const initialTelemetry = resolveSolarTelemetry({
    timezone: config.timezone,
    time: config.time,
    weather: config.weather,
  });

  let currentHour = initialTelemetry.solarHour;
  let targetHour = initialTelemetry.solarHour;
  let currentDay = initialTelemetry.dayOfMonth;

  const weatherWeights: Record<SkyWeather, number> = {
    clear: (config.weather ?? "clear") === "clear" ? 1 : 0,
    clouds: config.weather === "clouds" ? 1 : 0,
    rain: config.weather === "rain" ? 1 : 0,
    fog: config.weather === "fog" ? 1 : 0,
    snow: config.weather === "snow" ? 1 : 0,
  };

  let rafId: number | null = null;
  let isIntersecting = true;
  let isDocumentHidden =
    typeof document !== "undefined" ? document.hidden : false;
  let prefersReducedMotion = false;
  let elapsedSec = 0;
  let lastFrameTime =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  if (typeof window !== "undefined" && "matchMedia" in window) {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotion = mq.matches;
  }

  function syncTargetsFromConfig() {
    const telemetry = resolveSolarTelemetry({
      timezone: config.timezone,
      time: config.time,
      weather: config.weather,
    });
    targetHour = telemetry.solarHour;
    currentDay = config.dayOfMonth ?? telemetry.dayOfMonth;
  }

  function drawFrame(dtSec: number) {
    if (!ctx || !offCtx || !imageData || !data) return;

    const activeWeather: SkyWeather = config.weather ?? "clear";

    if (prefersReducedMotion) {
      currentHour = targetHour;
      (Object.keys(weatherWeights) as SkyWeather[]).forEach((w) => {
        weatherWeights[w] = w === activeWeather ? 1 : 0;
      });
    } else {
      // Smoothly interpolate solar hour and weather weights without snapping
      const stepFactor = Math.min(1, dtSec * 7.5);
      currentHour = lerpHour24(currentHour, targetHour, stepFactor);

      const weatherStep = Math.min(1, dtSec * 5.5);
      (Object.keys(weatherWeights) as SkyWeather[]).forEach((w) => {
        const goal = w === activeWeather ? 1 : 0;
        weatherWeights[w] += (goal - weatherWeights[w]) * weatherStep;
        if (Math.abs(goal - weatherWeights[w]) < 0.005) {
          weatherWeights[w] = goal;
        }
      });
    }

    const h = ((currentHour % 24) + 24) % 24;
    const center = size * 0.5;
    const radius = size * 0.5;

    // Celestial positions in normalized [0..1] space
    const sunVisible = h >= 5.15 && h <= 19.25;
    const sunU = sunVisible ? (h - 5.15) / (19.25 - 5.15) : -1;
    const sunNx = 0.16 + sunU * 0.68;
    const sunNy = 0.75 - Math.sin(Math.max(0, Math.min(1, sunU)) * Math.PI) * 0.5;

    const moonVisible = h >= 18.85 || h <= 5.55;
    const moonRawH = h >= 18.85 ? h - 18.85 : h + (24 - 18.85);
    const moonU = moonRawH / (24 - 18.85 + 5.55);
    const moonNx = 0.17 + moonU * 0.66;
    const moonNy =
      0.74 - Math.sin(Math.max(0, Math.min(1, moonU)) * Math.PI) * 0.48;

    // Night star visibility factor (p >= 2.8 or pre-dawn)
    let nightFactor = 0;
    if (h >= 19.2 || h <= 5.2) {
      if (h >= 19.2 && h < 20.6) nightFactor = (h - 19.2) / 1.4;
      else if (h <= 5.2 && h > 4.0) nightFactor = (5.2 - h) / 1.2;
      else nightFactor = 1;
    }

    // Cloud coverage combines `clouds`, `rain`, and `snow`
    const cloudWeight = Math.min(
      1,
      weatherWeights.clouds + weatherWeights.rain * 0.95 + weatherWeights.snow * 0.65
    );

    const isGoldenOrDawn =
      (h >= 5.0 && h <= 7.4) || (h >= 16.8 && h <= 19.4);
    const isNightSky = h < 5.3 || h >= 19.5;

    // Precompute lunar crescent shadow offset from calendar day (1..30)
    const lunarCycle = ((currentDay % 29) - 14) / 14; // -1..1
    const crescentOffsetNx =
      (lunarCycle >= 0 ? 0.045 : -0.045) * (0.45 + Math.abs(lunarCycle) * 0.45);

    const sunRadiusNorm = 0.088;
    const sunHaloNorm = 0.21;
    const moonRadiusNorm = 0.082;
    const moonHaloNorm = 0.17;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const bayer = getBayerThreshold(x, y);
        const bayerAlt = getBayerThreshold(x + 2, y + 1);

        // Convex Droplet Lens Magnification Optics:
        // Center appears 1.15x magnified compared to the curved rim
        const dxNorm = (x + 0.5 - center) / radius;
        const dyNorm = (y + 0.5 - center) / radius;
        const rSq = dxNorm * dxNorm + dyNorm * dyNorm;

        const invMag = 1 / 1.15; // 0.869565
        const lensFactor = invMag + (1 - invMag) * Math.min(1.2, rSq);
        const sampleNx = 0.5 + dxNorm * lensFactor * 0.5;
        const sampleNy = 0.5 + dyNorm * lensFactor * 0.5;

        // 1. Base Dithered Atmospheric Gradient
        let paletteIdx = sampleSkyPaletteIndex(
          h,
          sampleNy,
          bayer,
          weatherWeights
        );

        // 2. Twinkling Stars at Night (p >= 2.8)
        if (nightFactor > 0.15 && sampleNy < 0.78) {
          for (let s = 0; s < STARS.length; s++) {
            const star = STARS[s];
            const sdx = Math.abs(sampleNx - star.nx);
            const sdy = Math.abs(sampleNy - star.ny);
            const pixelTol = 0.58 / size;
            if (sdx < pixelTol && sdy < pixelTol) {
              const twinkle =
                0.55 +
                0.45 *
                  Math.sin(elapsedSec * (star.tier === 1 ? 3.2 : 2.1) + star.phaseOffset);
              if (nightFactor * twinkle > bayer * 0.85) {
                paletteIdx = star.tier === 1 && twinkle > 0.72 ? 14 : 13;
              }
              break;
            }
          }
        }

        // 3. Sun Trajectory & Dithered Solar Corona
        if (sunVisible) {
          const sdx = sampleNx - sunNx;
          const sdy = sampleNy - sunNy;
          const dist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (dist <= sunRadiusNorm) {
            paletteIdx = isGoldenOrDawn && dist > sunRadiusNorm * 0.68 ? 8 : 9;
          } else if (dist <= sunHaloNorm) {
            const haloStrength = 1 - (dist - sunRadiusNorm) / (sunHaloNorm - sunRadiusNorm);
            if (haloStrength * 0.85 > bayer) {
              paletteIdx = isGoldenOrDawn ? (haloStrength > 0.55 ? 8 : 7) : 13;
            }
          }
        }

        // 4. Moon Trajectory, Lunar Phase & Craters
        if (moonVisible) {
          const mdx = sampleNx - moonNx;
          const mdy = sampleNy - moonNy;
          const dist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (dist <= moonRadiusNorm) {
            // Check crescent occlusion shadow circle
            const shadowDx = sampleNx - (moonNx + crescentOffsetNx);
            const shadowDy = sampleNy - (moonNy - 0.015);
            const shadowDist = Math.sqrt(shadowDx * shadowDx + shadowDy * shadowDy);
            const isCrescentShadow =
              Math.abs(lunarCycle) < 0.65 && shadowDist < moonRadiusNorm * 0.86;

            if (isCrescentShadow) {
              paletteIdx = bayer > 0.5 ? 2 : 1;
            } else {
              // Subtle lunar craters on the lit disk
              const c1 =
                Math.hypot(mdx + 0.022, mdy - 0.014) < moonRadiusNorm * 0.26;
              const c2 =
                Math.hypot(mdx - 0.024, mdy + 0.02) < moonRadiusNorm * 0.21;
              paletteIdx = c1 || c2 ? 13 : 14;
            }
          } else if (dist <= moonHaloNorm) {
            const aura = 1 - (dist - moonRadiusNorm) / (moonHaloNorm - moonRadiusNorm);
            if (aura * 0.6 > bayer) {
              paletteIdx = isNightSky ? 2 : 12;
            }
          }
        }

        // 5. Distant Horizon Atmospheric Shimmer / Sea Base (v >= 0.83)
        if (sampleNy >= 0.83) {
          const horizonDepth = (sampleNy - 0.83) / 0.17;
          const waveRipple =
            Math.sin(sampleNx * 22 + elapsedSec * 1.8) * 0.5 + 0.5;
          if (horizonDepth > 0.35) {
            if (isNightSky) {
              paletteIdx = horizonDepth > 0.7 && bayer > 0.4 ? 0 : 1;
              // Moonlit shimmer reflection on water
              if (
                moonVisible &&
                Math.abs(sampleNx - moonNx) < 0.11 &&
                waveRipple * 0.7 > bayer
              ) {
                paletteIdx = 13;
              }
            } else if (isGoldenOrDawn) {
              paletteIdx = horizonDepth > 0.65 ? 3 : 4;
              if (
                sunVisible &&
                Math.abs(sampleNx - sunNx) < 0.14 &&
                waveRipple * 0.8 > bayer
              ) {
                paletteIdx = 8;
              }
            } else {
              paletteIdx = horizonDepth > 0.65 ? 10 : 11;
              if (
                sunVisible &&
                Math.abs(sampleNx - sunNx) < 0.13 &&
                waveRipple * 0.75 > bayer
              ) {
                paletteIdx = 13;
              }
            }
          }
        }

        // 6. Two-Layer Procedural Pixel Clouds with Differential Velocities & Undershadows
        if (cloudWeight > 0.05 && sampleNy >= 0.14 && sampleNy <= 0.66) {
          for (let c = 0; c < CLOUD_PUFFS.length; c++) {
            const puff = CLOUD_PUFFS[c];
            const speed = puff.layer === 0 ? 0.022 : 0.044;
            const driftX = (puff.baseX + elapsedSec * speed) % 1.25 - 0.12;
            const relX = (sampleNx - driftX) / puff.width;
            const relY = (sampleNy - puff.baseY) / puff.height;

            if (relX >= 0 && relX <= 1 && relY >= -0.4 && relY <= 1) {
              // Multi-lobe cumulus silhouette
              const lobe1 =
                Math.hypot((relX - 0.28) * 1.7, (relY - 0.45) * 1.4) < 0.52;
              const lobe2 =
                Math.hypot((relX - 0.52) * 1.5, (relY - 0.22) * 1.3) < 0.58;
              const lobe3 =
                Math.hypot((relX - 0.75) * 1.8, (relY - 0.48) * 1.4) < 0.48;
              const flatBase = relX > 0.12 && relX < 0.88 && relY > 0.35 && relY < 0.78;

              if ((lobe1 || lobe2 || lobe3 || flatBase) && cloudWeight > bayer * 0.85) {
                const isUndershadow = relY > 0.52 || (relY > 0.38 && bayerAlt > 0.5);
                if (weatherWeights.rain > 0.45) {
                  paletteIdx = isUndershadow ? (isNightSky ? 0 : 2) : 15;
                } else if (isNightSky) {
                  paletteIdx = isUndershadow ? 1 : 15;
                } else if (isGoldenOrDawn) {
                  paletteIdx = isUndershadow ? 4 : relY < 0.18 ? 8 : 7;
                } else {
                  paletteIdx = isUndershadow
                    ? puff.layer === 0
                      ? 12
                      : 15
                    : 14;
                }
              }
            }
          }
        }

        // 7. Fog Overlay: Horizontal Bayer Dither Bands Obscuring Celestial Bodies
        if (weatherWeights.fog > 0.08 && sampleNy >= 0.24 && sampleNy <= 0.88) {
          const bandWave =
            Math.sin(sampleNy * 28 + Math.sin(sampleNx * 5 + elapsedSec * 0.7)) *
              0.5 +
            0.5;
          const fogDensity = weatherWeights.fog * (0.35 + 0.55 * bandWave);
          if (fogDensity > bayerAlt) {
            paletteIdx = isNightSky
              ? bayer > 0.5
                ? 15
                : 2
              : bayer > 0.35
                ? 14
                : 13;
          }
        }

        // 8. Rain Overlay: Diagonal Pixel Streaks + Intermittent Splash Pixels at Lens Base
        if (weatherWeights.rain > 0.12) {
          const tick = Math.floor(elapsedSec * 18);
          const slantedX = (x + Math.floor(y * 0.5) + tick) % 9;
          const slantedY = (y + tick * 2) % 11;
          if (
            slantedX === 0 &&
            slantedY < 3 &&
            sampleNy > 0.22 &&
            sampleNy < 0.86 &&
            weatherWeights.rain > bayer * 0.75
          ) {
            paletteIdx = isNightSky ? 12 : 13;
          }

          // Intermittent splash pixels along lower lens base
          if (sampleNy >= 0.81 && sampleNy <= 0.88) {
            const splashCell = Math.floor(x / 4);
            const splashPhase = (tick + splashCell * 5) % 12;
            const localX = x % 4;
            if (
              splashPhase < 3 &&
              (localX === 1 || localX === 3) &&
              weatherWeights.rain > 0.4
            ) {
              paletteIdx = 14;
            }
          }
        }

        // 9. Snow Overlay: Gentle Meandering White Flakes Fluttering Downward
        if (weatherWeights.snow > 0.12 && sampleNy > 0.12 && sampleNy < 0.9) {
          const snowY = Math.floor(y - elapsedSec * 7.5);
          const sway = Math.round(Math.sin(elapsedSec * 2.2 + y * 0.35) * 1.5);
          const snowX = x + sway;
          const cellHash =
            (((snowX * 37) ^ (snowY * 59)) & 0xff) / 255;
          if (cellHash < 0.055 * weatherWeights.snow) {
            paletteIdx = bayer > 0.3 ? 14 : 13;
          }
        }

        const rgb = SKY_PALETTE_16[paletteIdx] ?? SKY_PALETTE_16[0];
        const idx = (y * size + x) * 4;
        data[idx] = rgb[0];
        data[idx + 1] = rgb[1];
        data[idx + 2] = rgb[2];
        data[idx + 3] = 255;
      }
    }

    offCtx.putImageData(imageData, 0, 0);
    if (offscreenCanvas && ctx !== offCtx) {
      ctx.drawImage(offscreenCanvas, 0, 0);
    }
  }

  function loop(now: number) {
    rafId = null;
    if (isDocumentHidden || !isIntersecting) return;

    const dtSec = Math.min(0.1, Math.max(0.001, (now - lastFrameTime) / 1000));
    lastFrameTime = now;
    elapsedSec += dtSec;

    drawFrame(dtSec);

    if (!prefersReducedMotion) {
      rafId = window.requestAnimationFrame(loop);
    }
  }

  function startLoop() {
    if (prefersReducedMotion) {
      drawFrame(0.016);
      return;
    }
    if (rafId === null && !isDocumentHidden && isIntersecting) {
      lastFrameTime = performance.now();
      rafId = window.requestAnimationFrame(loop);
    }
  }

  function stopLoop() {
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  // Visibility & IntersectionObserver lifecycle management
  const handleVisibilityChange = () => {
    if (typeof document === "undefined") return;
    isDocumentHidden = document.hidden;
    if (isDocumentHidden) {
      stopLoop();
    } else {
      startLoop();
    }
  };

  let observer: IntersectionObserver | null = null;
  if (typeof window !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target === canvas) {
              isIntersecting = entry.isIntersecting;
              if (isIntersecting) {
                startLoop();
              } else {
                stopLoop();
              }
            }
          }
        },
        { threshold: 0.01 }
      );
      observer.observe(canvas);
    }
  }

  // Render initial frame immediately
  drawFrame(0.016);
  startLoop();

  return {
    updateConfig(nextConfig: SkyEngineConfig) {
      config = { ...nextConfig };
      syncTargetsFromConfig();
      if (prefersReducedMotion) {
        drawFrame(0.016);
      } else {
        startLoop();
      }
    },
    renderNow() {
      drawFrame(0.016);
    },
    destroy() {
      stopLoop();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
        observer = null;
      }
    },
  };
}
