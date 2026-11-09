// Harbour pixel world — a tiny low-resolution seaside scene rendered into an offscreen canvas.
// Time of day is a single "phase" value p: 0 = midday, 1 = dusk, 2 = deep night.
// Objects switch palette stops through an ordered (Bayer) dither; sky and sea are
// continuous gradients that get posterised with the same dither, so nothing ever blends smoothly.

export const CORE_W = 184;
export const CORE_H = 96;
const HORIZON = 54;
const LX = 138; // lighthouse axis
const DECK = 74; // pier deck top

export type RGB = [number, number, number];
export interface Glow {
  x: number;
  y: number;
  r: number;
  c: string;
  a: number;
}
export interface Frame {
  p: number;
  glows: Glow[];
}

const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const mixRGB = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const ramp3 = (p: number, s: [RGB, RGB, RGB]): RGB => (p <= 1 ? mixRGB(s[0], s[1], clamp(p)) : mixRGB(s[1], s[2], clamp(p - 1)));
export const css = (c: RGB, a = 1) => `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;
export const hexRamp = (a: string, b: string, c: string): [RGB, RGB, RGB] => [hex(a), hex(b), hex(c)];

const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x: number, y: number) => BAY[((y & 3) << 2) | (x & 3)];

const hash = (x: number, y: number) => {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---- phase of the day from the knob position (0..1)
export const phaseOf = (x: number) => {
  if (x < 0.2) return 0;
  if (x < 0.5) return smooth(0, 1, (x - 0.2) / 0.3);
  if (x < 0.76) return 1 + smooth(0, 1, (x - 0.5) / 0.26);
  return 2;
};
export const phaseLabel = (p: number) => (p < 0.3 ? 'Midday' : p < 0.85 ? 'Golden hour' : p < 1.35 ? 'Dusk' : 'Moonlit');

export const pageColors = (p: number) => ({
  bg: css(ramp3(p, hexRamp('#efe5cf', '#d99a88', '#0a0f21'))),
  glow: css(ramp3(p, hexRamp('#fbf4e2', '#f4c8a2', '#1b2650'))),
  fg: css(ramp3(p, hexRamp('#2a2a3a', '#3a2238', '#d8dff6'))),
  muted: css(ramp3(p, hexRamp('#6c6a78', '#6b4a58', '#8a94ba'))),
});

// ---- materials: [midday, dusk, night]
const DEFS: Record<string, [string, string, string]> = {
  ROCK_D: ['#4f5766', '#3c3450', '#161b33'],
  ROCK_L: ['#7d8795', '#8a6070', '#2b3558'],
  TUFT: ['#6fa24e', '#58654a', '#203a3c'],
  TOWER_W: ['#fbf3e2', '#f6c9a8', '#6a74a6'],
  TOWER_WS: ['#d8cdb6', '#c08f8c', '#434c80'],
  TOWER_R: ['#e4553f', '#b3454f', '#2f2c5a'],
  TOWER_RS: ['#b53b2e', '#7e3048', '#201f45'],
  IRON: ['#2a3050', '#241f3c', '#0a0c1c'],
  ROOF: ['#2f4a70', '#2b2850', '#121733'],
  ROOF_L: ['#4a6c98', '#4a3c6a', '#243058'],
  LAMP: ['#cdeaf2', '#ffd88a', '#fff2b4'],
  LANTERN: ['#ffe9a0', '#ffdc78', '#fff2b0'],
  WOOD: ['#a8743f', '#80504a', '#2d2438'],
  WOOD_L: ['#cc9a62', '#aa6c5c', '#3d3350'],
  WOOD_D: ['#6a4224', '#4a2e40', '#171421'],
  CAT: ['#ef9d3a', '#bd7248', '#3b3149'],
  CAT_D: ['#b86a22', '#8a4a40', '#241f35'],
  CAT_W: ['#fff3df', '#ebc6b0', '#6b6c94'],
  CAT_E: ['#1c2c2a', '#1c2230', '#101424'],
  HULL: ['#2a6a8a', '#3b3a6c', '#141c3e'],
  HULL_T: ['#f5ecd8', '#f0b896', '#59638f'],
  SAIL: ['#fffaf0', '#ffd0a4', '#7480ac'],
  SAIL_S: ['#e4d8c0', '#d9a090', '#4c5486'],
  STAR: ['#ffffff', '#ffffff', '#ffffff'],
  STAR_DIM: ['#8aa0c8', '#8aa0c8', '#8aa0c8'],
  CLOUD: ['#ffffff', '#ffb9a2', '#3c4876'],
  CLOUD_S: ['#cfe2f0', '#c87a92', '#262f58'],
  SUN: ['#fff6bc', '#fff0b0', '#fff0b0'],
  SUN_RIM: ['#ffd96a', '#ffa95a', '#ffa95a'],
  MOON: ['#f8f3e2', '#f8f3e2', '#f8f3e2'],
  MOON_D: ['#cdccc6', '#cdccc6', '#cdccc6'],
  GULL: ['#fafafa', '#6a4660', '#8a96bc'],
  GULL_D: ['#6a7384', '#3a2a48', '#4a5478'],
  FOAM: ['#e8f8f8', '#ffd6c4', '#5075ac'],
  ZZZ: ['#d6ddff', '#d6ddff', '#d6ddff'],
  FISH: ['#ffb23c', '#ff9a4a', '#b8c8ff'],
};
const NAMES = Object.keys(DEFS);
const M: Record<string, number> = {};
NAMES.forEach((n, i) => {
  M[n] = i + 1;
});
const PAL = new Uint32Array((NAMES.length + 1) * 3);
NAMES.forEach((n, i) => {
  DEFS[n].forEach((h, s) => {
    const c = hex(h);
    PAL[(i + 1) * 3 + s] = ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0;
  });
});

const SKY: RGB[][] = [
  [hex('#4aa3e6'), hex('#8fd0f0'), hex('#e2f6f4')],
  [hex('#3f3a7c'), hex('#c25a80'), hex('#ffbb74')],
  [hex('#050818'), hex('#0c1636'), hex('#1d3060')],
];
const SEA: RGB[][] = [
  [hex('#58bfcb'), hex('#1c6f8e')],
  [hex('#c0647c'), hex('#3a2a5e')],
  [hex('#14305c'), hex('#050918')],
];
const skyAt = (k: number, t: number): RGB => (t < 0.55 ? mixRGB(SKY[k][0], SKY[k][1], t / 0.55) : mixRGB(SKY[k][1], SKY[k][2], (t - 0.55) / 0.45));
const seaAt = (k: number, t: number): RGB => mixRGB(SEA[k][0], SEA[k][1], t);

// ---- sprites
const SIT = [
  '.......o.o.',
  '.......ooo.',
  '......oeoeo',
  '......owwwo',
  '.....ooooo.',
  '..oooooooo.',
  '.odoooodooo',
  'oddooooooo.',
  'oooooooooo.',
  '..wwwwwww..',
];
const SLEEP = ['........o.o', '....ooooooo', '..oodoodoee', '.ooooooooow', 'owwwwwwwwwo'];
const CAT_MAP: Record<string, number> = { o: M.CAT, d: M.CAT_D, w: M.CAT_W, e: M.CAT_E };

const DITHER_LEVELS = 14;

export function createHarbour() {
  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d', { willReadFrequently: false })!;
  let bw = CORE_W;
  let bh = CORE_H;
  let ox = 0;
  let oy = 0;
  let hy = HORIZON;
  let mat = new Uint8Array(1);
  let vr = new Uint8Array(1);
  let img = new ImageData(1, 1);
  let px = new Uint32Array(img.data.buffer);
  let rows = new Float32Array(3);
  let rowPhase = new Float32Array(1);

  const stars = Array.from({ length: 140 }, (_, i) => ({
    x: Math.floor(lerp(-80, CORE_W + 80, hash(i, 1))),
    y: Math.floor(lerp(-50, HORIZON - 7, hash(i, 2))),
    s: hash(i, 3),
    big: hash(i, 4) < 0.12,
  }));

  const clouds = [
    { x: 10, y: 12, w: 30, h: 8, sp: 0.9, seed: 1 },
    { x: 92, y: 24, w: 22, h: 6, sp: 1.3, seed: 2 },
    { x: 150, y: 7, w: 36, h: 9, sp: 0.6, seed: 3 },
    { x: 58, y: 35, w: 18, h: 5, sp: 1.7, seed: 4 },
  ].map((c) => {
    const blobs = Array.from({ length: 6 }, (_, i) => [c.w * ((i + 0.5) / 6) + (hash(c.seed, i) - 0.5) * 3, c.h * (0.45 + (hash(c.seed, i + 9) - 0.5) * 0.35), c.h * (0.3 + hash(c.seed, i + 20) * 0.32)]);
    const list: number[] = [];
    for (let y = 0; y < c.h + 3; y++) {
      for (let x = -2; x < c.w + 3; x++) {
        if (blobs.some(([bx, by, br]) => Math.hypot(x - bx, (y - by) * 1.25) < br)) list.push(x, y, y > c.h * 0.62 ? 1 : 0);
      }
    }
    return { ...c, list };
  });

  const fish = { t0: -1, x: 80, next: 5 };

  const resize = (w: number, h: number) => {
    bw = Math.max(64, w);
    bh = Math.max(48, h);
    ox = (bw - CORE_W) >> 1;
    oy = (bh - CORE_H) >> 1;
    hy = oy + HORIZON;
    canvas.width = bw;
    canvas.height = bh;
    mat = new Uint8Array(bw * bh);
    vr = new Uint8Array(bw * bh);
    img = g.createImageData(bw, bh);
    px = new Uint32Array(img.data.buffer);
    rows = new Float32Array(bh * 3);
    rowPhase = new Float32Array(bh);
    for (let y = 0; y < bh; y++) rowPhase[y] = hash(y, 7) * 40;
  };

  // ---- drawing helpers (core coordinates, origin at the scene's top-left)
  const put = (x: number, y: number, m: number) => {
    const X = x + ox;
    const Y = y + oy;
    if (X < 0 || Y < 0 || X >= bw || Y >= bh) return;
    mat[Y * bw + X] = m;
  };
  const putSky = (x: number, y: number, m: number) => {
    if (y >= HORIZON) return;
    put(x, y, m);
  };
  const rect = (x: number, y: number, w: number, h: number, m: number) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, m);
  };
  const setVar = (x: number, y: number, v: number) => {
    const X = x + ox;
    const Y = y + oy;
    if (X < 0 || Y < 0 || X >= bw || Y >= bh) return;
    const i = Y * bw + X;
    if (v > vr[i]) vr[i] = v;
  };
  const blit = (map: string[], pal: Record<string, number>, x: number, y: number, blink = false) => {
    map.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        let ch = row[i];
        if (ch === '.') continue;
        if (blink && ch === 'e') ch = 'o';
        put(x + i, y + j, pal[ch]);
      }
    });
  };

  const render = (x: number, t: number, calm: boolean): Frame => {
    const p = phaseOf(x);
    mat.fill(0);
    vr.fill(0);
    const glows: Glow[] = [];
    const glow = (cx: number, cy: number, r: number, c: string, a: number) => {
      if (a > 0.01) glows.push({ x: cx + ox + 0.5, y: cy + oy + 0.5, r, c, a });
    };

    // celestial bodies follow the knob
    const ts = clamp(x / 0.5, 0, 1.1);
    const sunX = 52 + ts * 50;
    const sunY = 16 + Math.pow(ts, 1.7) * 46;
    const sunR = 5 + Math.round(ts * 2);
    const sunVis = clamp((HORIZON - sunY + 2) / 10, 0, 1);
    const tm = clamp((x - 0.42) / 0.58, 0, 1);
    const moonX = 26 + tm * 40;
    const moonY = 60 - tm * 44;
    const moonVis = x > 0.42 ? clamp((HORIZON - moonY + 2) / 10, 0, 1) : 0;
    const starAmt = clamp((p - 1.1) / 0.8);
    const lampOn = clamp((p - 0.55) / 0.5);
    const pierOn = clamp((p - 0.45) / 0.5);

    // ---- stars
    if (starAmt > 0.02) {
      for (const s of stars) {
        if (s.s > starAmt) continue;
        const tw = calm ? 1 : Math.sin(t * (1.2 + s.s * 3) + s.s * 50);
        if (tw < -0.7) continue;
        putSky(s.x, s.y, tw < 0.1 && !s.big ? M.STAR_DIM : M.STAR);
        if (s.big && tw > 0.5) {
          putSky(s.x - 1, s.y, M.STAR_DIM);
          putSky(s.x + 1, s.y, M.STAR_DIM);
          putSky(s.x, s.y - 1, M.STAR_DIM);
          putSky(s.x, s.y + 1, M.STAR_DIM);
        }
      }
    }

    // ---- sun
    if (sunVis > 0) {
      for (let dy = -sunR - 5; dy <= sunR + 5; dy++) {
        for (let dx = -sunR - 5; dx <= sunR + 5; dx++) {
          const d = Math.hypot(dx, dy);
          const X = Math.round(sunX) + dx;
          const Y = Math.round(sunY) + dy;
          if (d <= sunR - 1) putSky(X, Y, M.SUN);
          else if (d <= sunR) putSky(X, Y, M.SUN_RIM);
          else if (d <= sunR + 5 && bay(X, Y) < (sunR + 5.5 - d) * 2.4) putSky(X, Y, M.SUN_RIM);
        }
      }
      glow(sunX, sunY, 56, p < 0.6 ? '255,246,210' : '255,160,96', 0.3 * sunVis);
    }

    // ---- moon
    if (moonVis > 0) {
      const R = 6;
      const mx = Math.round(moonX);
      const my = Math.round(moonY);
      for (let dy = -R - 3; dy <= R + 3; dy++) {
        for (let dx = -R - 3; dx <= R + 3; dx++) {
          const d = Math.hypot(dx, dy);
          if (d <= R) {
            const crater = (dx === -2 && dy === -2) || (dx === 2 && dy === 1) || (dx === -3 && dy === 2) || (dx === 1 && dy === -3) || (dx === 3 && dy === -1);
            const shade = dx * 0.7 + dy * 0.7 > R * 0.5;
            putSky(mx + dx, my + dy, crater || shade ? M.MOON_D : M.MOON);
          } else if (d <= R + 3 && bay(mx + dx, my + dy) < (R + 3.4 - d) * 1.6) putSky(mx + dx, my + dy, M.STAR_DIM);
        }
      }
      glow(moonX, moonY, 46, '176,200,255', 0.22 * moonVis * clamp(p - 0.6));
    }

    // ---- clouds
    for (const c of clouds) {
      const cx = Math.round(((c.x + (calm ? 0 : t * c.sp * 0.6) + 90) % (CORE_W + 180)) - 90);
      for (let i = 0; i < c.list.length; i += 3) {
        const X = cx + c.list[i];
        const Y = c.y + c.list[i + 1];
        const under = c.list[i + 2];
        if (under && bay(X, Y) > 11) continue;
        putSky(X, Y, under ? M.CLOUD_S : M.CLOUD);
      }
    }

    // ---- gulls (by day only)
    if (p < 0.9) {
      for (let i = 0; i < 3; i++) {
        const gx = Math.round((((calm ? 30 : t * (6 + i * 1.5)) + i * 70) % (CORE_W + 60)) - 30 + (calm ? i * 40 : 0));
        const gy = Math.round(14 + i * 9 + (calm ? 0 : Math.sin(t * 0.8 + i) * 3));
        const up = !calm && Math.floor(t * 5 + i) % 2 === 0;
        put(gx, gy, M.GULL);
        if (up) {
          put(gx - 1, gy - 1, M.GULL);
          put(gx - 2, gy - 2, M.GULL_D);
          put(gx + 1, gy - 1, M.GULL);
          put(gx + 2, gy - 2, M.GULL_D);
        } else {
          put(gx - 1, gy, M.GULL);
          put(gx - 2, gy + 1, M.GULL_D);
          put(gx + 1, gy, M.GULL);
          put(gx + 2, gy + 1, M.GULL_D);
        }
      }
    }

    // ---- sailboat (behind the island)
    const bx = Math.round(calm ? 44 : ((t * 2.4 + 20) % (CORE_W + 100)) - 50);
    const by = HORIZON + 9 + (calm ? 0 : Math.round(Math.sin(t * 1.3)));
    for (let i = 0; i < 3; i++) rect(bx + i, by + i, 15 - i * 2, 1, i === 0 ? M.HULL_T : M.HULL);
    rect(bx + 7, by - 17, 1, 17, M.WOOD_D);
    for (let j = 0; j < 14; j++) {
      const w = Math.round(j * 0.55) + 1;
      rect(bx + 8, by - 15 + j, w, 1, M.SAIL);
      put(bx + 7 + w, by - 15 + j, M.SAIL_S);
      const w2 = Math.round(j * 0.4);
      if (w2 > 0) rect(bx + 6 - w2, by - 13 + j, w2, 1, j > 8 ? M.SAIL_S : M.SAIL);
    }
    if (pierOn > 0.2) {
      rect(bx + 7, by - 19, 1, 2, M.LANTERN);
      glow(bx + 7, by - 18, 26, '255,214,120', 0.5 * pierOn);
    }
    for (let i = 1; i < 8; i++) if ((i + Math.floor(t * 3)) % 2 === 0) put(bx - i, by + 3, M.FOAM);

    // ---- island + lighthouse
    for (let X = 116; X <= 164; X++) {
      const d = Math.abs(X - 139);
      const top = 66 + Math.floor(d * 0.45 + hash(X, 1) * 2);
      for (let Y = top; Y <= 80; Y++) {
        let m = hash(X, Y) > 0.78 ? M.ROCK_L : M.ROCK_D;
        if (Y === top) m = M.ROCK_L;
        else if (X < 130 && hash(X * 3, Y) > 0.6) m = M.ROCK_L;
        put(X, Y, m);
      }
      if (d < 12 && hash(X, 9) > 0.55) put(X, top - 1, M.TUFT);
    }
    for (let X = 114; X <= 166; X++) {
      if ((X + (calm ? 0 : Math.floor(t * 3))) % 3 !== 0) put(X, 81, M.FOAM);
      if ((X + (calm ? 1 : Math.floor(t * 2))) % 5 === 0) put(X, 82, M.FOAM);
    }
    for (let Y = 30; Y <= 67; Y++) {
      const tt = (Y - 30) / 37;
      const half = Math.round(4 + tt * 2.8);
      const red = Math.floor((Y - 30) / 6) % 2 === 1;
      for (let X = LX - half; X <= LX + half; X++) {
        const shaded = X >= LX + half - 2;
        put(X, Y, red ? (shaded ? M.TOWER_RS : M.TOWER_R) : shaded ? M.TOWER_WS : M.TOWER_W);
      }
    }
    rect(LX - 1, 62, 3, 5, M.WOOD_D);
    rect(LX - 1, 45, 2, 3, M.IRON);
    rect(LX - 8, 29, 17, 2, M.IRON);
    rect(LX - 8, 26, 17, 1, M.IRON);
    for (let X = LX - 8; X <= LX + 8; X += 2) {
      put(X, 27, M.IRON);
      put(X, 28, M.IRON);
    }
    rect(LX - 3, 19, 7, 7, M.LAMP);
    rect(LX - 3, 19, 1, 7, M.IRON);
    rect(LX + 3, 19, 1, 7, M.IRON);
    if (lampOn > 0.15) rect(LX - 1, 21, 3, 3, M.LANTERN);
    for (let Y = 13; Y <= 18; Y++) {
      const half = 1 + (Y - 13);
      rect(LX - half, Y, half * 2 + 1, 1, M.ROOF);
      put(LX - half, Y, M.ROOF_L);
      if (half > 2) put(LX - half + 1, Y, M.ROOF_L);
    }
    put(LX, 12, M.IRON);
    put(LX, 11, M.IRON);
    const flick = calm ? 1 : 0.94 + 0.06 * Math.sin(t * 11) * Math.sin(t * 3.7);
    glow(LX, 22, 74, '255,206,110', 0.62 * lampOn * flick);

    // ---- fish that occasionally leaps
    if (!calm) {
      if (fish.t0 < 0 && t > fish.next) {
        fish.t0 = t;
        fish.x = 64 + Math.random() * 30;
        fish.next = t + 6 + Math.random() * 8;
      }
      if (fish.t0 >= 0) {
        const u = (t - fish.t0) / 0.85;
        if (u > 1) fish.t0 = -1;
        else {
          const fx = Math.round(fish.x + u * 14);
          const fy = Math.round(68 - Math.sin(u * Math.PI) * 10);
          put(fx, fy, M.FISH);
          put(fx + 1, fy, M.FISH);
          put(fx - 1, fy - 1 + (u < 0.5 ? 1 : 0), M.FISH);
          if (u < 0.2 || u > 0.8) {
            const sx = fx + (u < 0.5 ? -1 : 1);
            put(sx - 1, 69, M.FOAM);
            put(sx + 2, 69, M.FOAM);
            put(sx, 68, M.FOAM);
            put(sx + 1, 68, M.FOAM);
          }
        }
      }
    }

    // ---- pier
    for (let X = -ox - 2; X <= 66; X++) {
      put(X, DECK, M.WOOD_L);
      put(X, DECK + 1, X % 7 === 0 ? M.WOOD_D : M.WOOD);
      put(X, DECK + 2, X % 7 === 0 ? M.WOOD_D : M.WOOD);
      put(X, DECK + 3, M.WOOD_D);
    }
    for (let X = 66 - 4; X > -ox - 14; X -= 12) {
      rect(X, DECK + 4, 2, 10, M.WOOD_D);
      put(X, DECK + 4, M.WOOD);
      put(X, DECK + 5, M.WOOD);
      const f = calm ? 0 : Math.floor(t * 2);
      put(X - 1, DECK + 11, (X + f) % 2 ? M.FOAM : M.WOOD_D);
      put(X + 2, DECK + 11, (X + f) % 2 ? M.WOOD_D : M.FOAM);
    }
    rect(60, DECK - 18, 1, 18, M.WOOD_D);
    rect(58, DECK - 21, 5, 1, M.IRON);
    rect(58, DECK - 17, 5, 1, M.IRON);
    rect(58, DECK - 20, 1, 3, M.IRON);
    rect(62, DECK - 20, 1, 3, M.IRON);
    rect(59, DECK - 20, 3, 3, M.LAMP);
    if (pierOn > 0.2) {
      rect(60, DECK - 19, 1, 1, M.LANTERN);
      glow(60, DECK - 19, 42, '255,200,110', 0.55 * pierOn * flick);
    }

    // ---- the cat: wide awake by day, curled up asleep at night
    const sleeping = p > 1.25;
    if (!sleeping) {
      const blink = !calm && t % 4.3 < 0.14;
      blit(SIT, CAT_MAP, 38, DECK - 10, blink);
      for (let i = 1; i <= 6; i++) {
        const wag = calm ? 0 : Math.round(Math.sin(t * 2.3 + i * 0.55) * i * 0.4);
        put(38 - i, DECK - 3 + wag - (i > 4 ? 1 : 0), i % 3 === 0 ? M.CAT_D : M.CAT);
      }
    } else {
      blit(SLEEP, CAT_MAP, 38, DECK - 5);
      for (let i = 1; i <= 3; i++) put(37 - i + 1, DECK - 1 - (i > 2 ? 1 : 0), M.CAT_D);
      for (let i = 0; i < 3; i++) {
        const u = calm ? 0.2 + i * 0.3 : (t * 0.35 + i / 3) % 1;
        const zx = Math.round(50 + u * 9 + Math.sin(u * 7 + i) * 1.5);
        const zy = Math.round(DECK - 12 - u * 22);
        if (u > 0.92) continue;
        rect(zx, zy, 3, 1, M.ZZZ);
        put(zx + 1, zy + 1, M.ZZZ);
        rect(zx, zy + 2, 3, 1, M.ZZZ);
      }
    }

    // ---- lighthouse beam: a wedge of dithered light that swings across the bay
    if (lampOn > 0.05) {
      const c = Math.cos(calm ? 2.7 : t * 0.8);
      const dir = c >= 0 ? 1 : -1;
      const len = 14 + 84 * Math.abs(c);
      for (let dx = 4; dx <= len; dx++) {
        const frac = dx / len;
        const half = 1 + dx * 0.11;
        const yc = 22 + dx * 0.1;
        const inten = (1 - frac * frac) * lampOn * (0.35 + 0.65 * Math.abs(c));
        for (let dy = -Math.ceil(half); dy <= Math.ceil(half); dy++) {
          const val = inten * (1 - (Math.abs(dy) / half) * 0.65);
          const X = LX + dir * dx;
          const Y = Math.round(yc + dy);
          if (val > 0 && val * 16 > bay(X, Y) + 1) setVar(X, Y, val > 0.55 ? 2 : 1);
        }
      }
    }

    compose(p, t, calm, [
      { x: sunX, vis: sunVis, c: mixRGB([255, 250, 214], [255, 190, 118], smooth(0, 1, p)), min: 0 },
      { x: moonX, vis: moonVis * clamp(p - 0.7), c: [226, 234, 255], min: 0 },
      { x: LX, vis: lampOn * 0.8, c: [255, 208, 120], min: 29 },
    ]);
    g.putImageData(img, 0, 0);
    return { p, glows };
  };

  interface Light {
    x: number;
    vis: number;
    c: RGB;
    min: number;
  }

  const compose = (p: number, t: number, calm: boolean, lights: Light[]) => {
    const a = Math.min(Math.floor(p), 1);
    const f = p - a;
    for (let y = 0; y < bh; y++) {
      let c: RGB;
      if (y < hy) {
        const tn = y / Math.max(hy - 1, 1);
        c = mixRGB(skyAt(a, tn), skyAt(a + 1, tn), f);
      } else {
        const tn = (y - hy) / Math.max(bh - hy - 1, 1);
        c = mixRGB(seaAt(a, tn), seaAt(a + 1, tn), f);
      }
      rows[y * 3] = c[0];
      rows[y * 3 + 1] = c[1];
      rows[y * 3 + 2] = c[2];
    }
    const hi = Math.max(hy - 1, 0) * 3;
    const crest: RGB = [rows[hi], rows[hi + 1], rows[hi + 2]];
    const step = 255 / (DITHER_LEVELS - 1);
    const q = (v: number, b: number) => {
      const lv = (clamp(v, 0, 255) / 255) * (DITHER_LEVELS - 1);
      const lo = Math.floor(lv);
      return Math.min(255, Math.round((lo + ((lv - lo) * 16 > b ? 1 : 0)) * step));
    };

    for (let y = 0; y < bh; y++) {
      const wy = y - hy;
      for (let x = 0; x < bw; x++) {
        const i = y * bw + x;
        const m = mat[i];
        let r: number;
        let gg: number;
        let b: number;
        if (m === 0) {
          r = rows[y * 3];
          gg = rows[y * 3 + 1];
          b = rows[y * 3 + 2];
          if (wy >= 0) {
            if ((wy & 1) === 0) {
              const n = Math.sin(x * 0.31 + rowPhase[y] + (calm ? 0 : t * 1.1)) + Math.sin(x * 0.13 + wy * 0.7 - (calm ? 0 : t * 0.6)) * 0.6;
              if (n > 1.25) {
                r = lerp(r, crest[0], 0.38);
                gg = lerp(gg, crest[1], 0.38);
                b = lerp(b, crest[2], 0.38);
              }
              for (const L of lights) {
                if (L.vis <= 0 || wy < L.min) continue;
                const w = 2 + (wy - L.min) * 0.2;
                const dx = Math.abs(x - (L.x + ox));
                if (dx >= w) continue;
                const chance = (1 - dx / w) * L.vis;
                if (Math.sin(x * 1.3 + wy * 2.1 + (calm ? 0 : t * 2.4)) > 1 - chance * 1.6) {
                  r = L.c[0];
                  gg = L.c[1];
                  b = L.c[2];
                }
              }
            }
          }
          const bb = bay(x, y);
          r = q(r, bb);
          gg = q(gg, bb);
          b = q(b, bb);
        } else {
          const useB = f * 16 > bay(x + 1, y + 2);
          const c = PAL[m * 3 + (useB ? a + 1 : a)];
          r = c & 255;
          gg = (c >>> 8) & 255;
          b = (c >>> 16) & 255;
        }
        const v = vr[i];
        if (v) {
          const k = v === 2 ? 0.55 : 0.28;
          r += (255 - r) * k;
          gg += (232 - gg) * k;
          b += (160 - b) * k;
        }
        px[i] = (0xff000000 | (Math.round(b) << 16) | (Math.round(gg) << 8) | Math.round(r)) >>> 0;
      }
    }
  };

  return { canvas, resize, render };
}
