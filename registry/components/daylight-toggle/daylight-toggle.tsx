"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CORE_H, createHarbour, css, hexRamp, ramp3, type Frame, type Glow } from "./harbour";

export interface DaylightToggleProps {
  /** Called whenever the time of day changes: 0 = midday, 1 = dusk, 2 = night. */
  onPhase?: (phase: number) => void;
  /** Called when the toggle commits to day (false) or night (true). */
  onChange?: (night: boolean) => void;
  /** Accessible name of the toggle switch. */
  label?: string;
  /** Additional CSS class names for the outer container. */
  className?: string;
}

const BEZEL_TOP = hexRamp("#fffaf0", "#f5cdb4", "#4a5580");
const BEZEL_BOT = hexRamp("#cdbf9f", "#8c5a6a", "#0f142c");
const MARGIN = 14; // extra world pixels around the window so the lens can peek past its edge
const RING_STEPS = 12;
const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

export function DaylightToggle({ onPhase, onChange, label = "Night mode", className }: DaylightToggleProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const cbRef = useRef({ onPhase, onChange });
  cbRef.current = { onPhase, onChange };

  useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const button = buttonRef.current!;
    const status = statusRef.current!;
    const ctx = canvas.getContext("2d")!;
    const world = createHarbour();
    const motionQ = matchMedia("(prefers-reduced-motion: reduce)");
    let calm = motionQ.matches;

    const L = {
      W: 1,
      H: 1,
      dpr: 1,
      pcx: 0,
      pcy: 0,
      pillW: 1,
      pillH: 1,
      bezel: 1,
      winW: 1,
      winH: 1,
      winL: 0,
      winT: 0,
      gap: 0,
      r: 1,
      travel: 1,
      travelCss: 1,
      k: 1,
      bw: 1,
      bh: 1,
      wl: 0,
      wt: 0,
    };

    let x = 0; // 0 = midday, 1 = night
    let velocity = 0;
    let target = 0;
    let moving = false;
    let checked = false;
    let stretch = 0;
    let stretchV = 0;
    let lift = 0;
    let liftT = 0;
    let drag: null | {
      id: number;
      start: number;
      from: number;
      want: number;
      moved: boolean;
      lastX: number;
      lastT: number;
      speed: number;
    } = null;
    let suppressClick = 0;

    let animT = 0;
    let worldAcc = 1;
    let lastX = -1;
    let dirty = true;
    let raf = 0;
    let last = 0;
    let visible = true;
    let frame: Frame = { p: 0, glows: [] };
    let lastP = -1;

    const pill = (c: CanvasRenderingContext2D, px: number, py: number, w: number, h: number) => {
      c.beginPath();
      c.roundRect(px, py, w, h, h / 2);
    };

    const measure = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = Math.max(2, Math.round(rect.width * dpr));
      const H = Math.max(2, Math.round(rect.height * dpr));
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      L.W = W;
      L.H = H;
      L.dpr = dpr;
      L.pcx = W / 2;
      L.pcy = H / 2;
      L.pillH = H / 1.32;
      L.pillW = L.pillH * 1.85;
      L.bezel = L.pillH * 0.05;
      L.winW = L.pillW - L.bezel * 2;
      L.winH = L.pillH - L.bezel * 2;
      L.winL = L.pcx - L.winW / 2;
      L.winT = L.pcy - L.winH / 2;
      L.gap = L.pillH * 0.035;
      L.r = L.winH / 2 - L.gap;
      L.travel = L.winW - 2 * (L.r + L.gap);
      L.travelCss = L.travel / dpr;
      L.k = Math.max(1, Math.floor(L.winH / CORE_H + 0.1));
      L.bw = Math.ceil(L.winW / L.k) + MARGIN * 2;
      L.bh = Math.ceil(L.winH / L.k) + MARGIN * 2;
      world.resize(L.bw, L.bh);
      L.wl = Math.round(L.pcx - (L.bw * L.k) / 2);
      L.wt = Math.round(L.pcy - (L.bh * L.k) / 2);
      lastX = -1;
    };

    const drawGlows = (c: CanvasRenderingContext2D, glows: Glow[], scale: number) => {
      for (const gl of glows) {
        const gr = c.createRadialGradient(gl.x, gl.y, 0, gl.x, gl.y, gl.r);
        gr.addColorStop(0, `rgba(${gl.c},${gl.a * scale})`);
        gr.addColorStop(0.4, `rgba(${gl.c},${gl.a * scale * 0.32})`);
        gr.addColorStop(1, `rgba(${gl.c},0)`);
        c.fillStyle = gr;
        c.fillRect(gl.x - gl.r, gl.y - gl.r, gl.r * 2, gl.r * 2);
      }
    };

    const draw = () => {
      const { W, H, k, pcx, pcy, pillW, pillH, bezel, winW, winH, winL, winT, bw, bh, wl, wt } = L;
      const p = frame.p;
      const night = clamp(p - 0.5, 0, 1.5) / 1.5;
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = false;

      const px0 = pcx - pillW / 2;
      const py0 = pcy - pillH / 2;

      // body of the switch
      ctx.save();
      pill(ctx, px0, py0, pillW, pillH);
      ctx.shadowColor = `rgba(${night > 0.5 ? "0,0,0" : "60,40,30"},${0.34 + night * 0.2})`;
      ctx.shadowBlur = pillH * 0.11;
      ctx.shadowOffsetY = pillH * 0.05;
      const body = ctx.createLinearGradient(0, py0, 0, py0 + pillH);
      body.addColorStop(0, css(ramp3(p, BEZEL_TOP)));
      body.addColorStop(1, css(ramp3(p, BEZEL_BOT)));
      ctx.fillStyle = body;
      ctx.fill();
      ctx.restore();

      // polished edge catching light from above
      ctx.save();
      const lw = Math.max(1, pillH * 0.007);
      pill(ctx, px0 + lw / 2, py0 + lw / 2, pillW - lw, pillH - lw);
      const rim = ctx.createLinearGradient(0, py0, 0, py0 + pillH);
      rim.addColorStop(0, "rgba(255,255,255,0.75)");
      rim.addColorStop(0.3, "rgba(255,255,255,0)");
      rim.addColorStop(0.82, "rgba(0,0,0,0)");
      rim.addColorStop(1, "rgba(0,0,0,0.28)");
      ctx.strokeStyle = rim;
      ctx.lineWidth = lw;
      ctx.stroke();
      ctx.restore();

      // lower lip of the recess
      ctx.save();
      pill(ctx, winL, winT, winW, winH);
      const lip = ctx.createLinearGradient(0, winT, 0, winT + winH);
      lip.addColorStop(0, "rgba(0,0,0,0)");
      lip.addColorStop(0.7, "rgba(255,255,255,0)");
      lip.addColorStop(1, `rgba(255,255,255,${0.5 - night * 0.3})`);
      ctx.strokeStyle = lip;
      ctx.lineWidth = Math.max(1.5, bezel * 0.14);
      ctx.stroke();
      ctx.restore();

      // the window onto the harbour
      ctx.save();
      pill(ctx, winL, winT, winW, winH);
      ctx.clip();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(world.canvas, wl, wt, bw * k, bh * k);
      ctx.restore();

      // light spilling over the glass and the frame
      ctx.save();
      pill(ctx, px0, py0, pillW, pillH);
      ctx.clip();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(wl, wt);
      ctx.scale(k, k);
      drawGlows(ctx, frame.glows, 0.85);
      ctx.restore();

      // inset shadow + sheen
      ctx.save();
      pill(ctx, winL, winT, winW, winH);
      ctx.clip();
      const vg = ctx.createLinearGradient(0, winT, 0, winT + winH);
      vg.addColorStop(0, "rgba(0,0,0,0.42)");
      vg.addColorStop(0.18, "rgba(0,0,0,0)");
      vg.addColorStop(0.9, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.22)");
      ctx.fillStyle = vg;
      ctx.fillRect(winL, winT, winW, winH);
      const sg = ctx.createLinearGradient(winL, winT, winL + winW * 0.5, winT + winH);
      sg.addColorStop(0, `rgba(255,255,255,${0.1 - night * 0.05})`);
      sg.addColorStop(0.4, "rgba(255,255,255,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(winL, winT, winW, winH);
      pill(ctx, winL, winT, winW, winH);
      ctx.lineWidth = bezel * 0.8;
      ctx.strokeStyle = "rgba(0,0,0,0.3)";
      ctx.stroke();
      ctx.restore();

      // ---- the brass porthole lens
      const { r, gap, travel } = L;
      const lcx = winL + gap + r + x * travel;
      const lcy = pcy;
      const rimW = r * 0.1;
      const rg = r - rimW; // glass radius
      const u = (lcx - wl) / k;
      const v = (lcy - wt) / k;
      const M = k + 1; // magnified: one world pixel becomes k+1 device pixels, still crisp

      // contact shadow cast on the window
      ctx.save();
      pill(ctx, winL, winT, winW, winH);
      ctx.clip();
      const sh = ctx.createRadialGradient(
        lcx,
        lcy + r * (0.1 + lift * 0.05),
        r * 0.7,
        lcx,
        lcy + r * (0.1 + lift * 0.05),
        r * 1.32,
      );
      sh.addColorStop(0, `rgba(0,0,0,${0.5 + night * 0.15})`);
      sh.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = sh;
      ctx.fillRect(lcx - r * 1.5, lcy - r * 1.5, r * 3, r * 3);
      ctx.restore();

      ctx.save();
      ctx.translate(lcx, lcy);
      ctx.scale((1 + 0.015 * lift) * (1 + 0.13 * stretch), (1 + 0.015 * lift) * (1 - 0.05 * stretch));
      const ox = Math.round(-u * M);
      const oy = Math.round(-v * M);

      // glass: flat zoomed centre, then rings that compress more of the harbour towards the edge
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, rg, 0, Math.PI * 2);
      ctx.clip();
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, rg * 0.72 + 1, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(world.canvas, ox, oy, bw * M, bh * M);
      ctx.restore();
      for (let i = 0; i < RING_STEPS; i++) {
        const r0 = rg * (0.72 + (0.28 * i) / RING_STEPS);
        const r1 = rg * (0.72 + (0.28 * (i + 1)) / RING_STEPS) + 0.75;
        const tt = (i + 0.5) / RING_STEPS;
        const f = M * (1 - 0.32 * tt * tt);
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, r1, 0, Math.PI * 2);
        ctx.arc(0, 0, r0, 0, Math.PI * 2, true);
        ctx.clip("evenodd");
        ctx.drawImage(world.canvas, Math.round(-u * f), Math.round(-v * f), bw * f, bh * f);
        ctx.restore();
      }

      // lamp light gathered by the glass
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(ox, oy);
      ctx.scale(M, M);
      drawGlows(ctx, frame.glows, 0.7);
      ctx.restore();

      // depth at the edge
      const ed = ctx.createRadialGradient(0, 0, rg * 0.55, 0, 0, rg);
      ed.addColorStop(0, "rgba(6,10,28,0)");
      ed.addColorStop(0.85, "rgba(6,10,28,0.25)");
      ed.addColorStop(1, "rgba(6,10,28,0.6)");
      ctx.fillStyle = ed;
      ctx.fillRect(-rg, -rg, rg * 2, rg * 2);

      // light pooled at the bottom of the glass
      ctx.globalCompositeOperation = "lighter";
      const pool = ctx.createRadialGradient(rg * 0.15, rg * 0.92, 0, rg * 0.15, rg * 0.92, rg * 0.7);
      pool.addColorStop(0, `rgba(255,236,200,${0.28 - night * 0.12})`);
      pool.addColorStop(1, "rgba(255,236,200,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(-rg, -rg, rg * 2, rg * 2);
      ctx.globalCompositeOperation = "source-over";

      // soft window reflection near the top and a tiny catch-light
      ctx.save();
      ctx.rotate(-0.32);
      const spec = ctx.createLinearGradient(0, -rg * 0.9, 0, -rg * 0.5);
      spec.addColorStop(0, "rgba(255,255,255,0.7)");
      spec.addColorStop(1, "rgba(255,255,255,0.04)");
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.ellipse(0, -rg * 0.7, rg * 0.52, rg * 0.17, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.arc(-rg * 0.6, -rg * 0.28, rg * 0.04, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // brass ring
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.arc(0, 0, rg, 0, Math.PI * 2, true);
      const brass = ctx.createLinearGradient(-r, -r, r, r);
      brass.addColorStop(0, "#fbe6ab");
      brass.addColorStop(0.3, "#d3a554");
      brass.addColorStop(0.62, "#86591f");
      brass.addColorStop(1, "#e6c070");
      ctx.fillStyle = brass;
      ctx.fill("evenodd");
      ctx.fillStyle = `rgba(8,10,34,${night * 0.38})`;
      ctx.fill("evenodd");
      ctx.lineWidth = Math.max(1, rimW * 0.14);
      ctx.strokeStyle = "rgba(40,20,0,0.65)";
      ctx.beginPath();
      ctx.arc(0, 0, rg, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,245,210,0.55)";
      ctx.beginPath();
      ctx.arc(0, 0, r - ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.stroke();
      // rivets
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const rx = Math.cos(a) * (r - rimW / 2);
        const ry = Math.sin(a) * (r - rimW / 2);
        ctx.fillStyle = "#5d3b12";
        ctx.beginPath();
        ctx.arc(rx, ry, rimW * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,240,200,0.8)";
        ctx.beginPath();
        ctx.arc(rx - rimW * 0.06, ry - rimW * 0.07, rimW * 0.07, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    // ---- state
    const statusText = (v: number) => (v >= 1 ? "Night" : v <= 0 ? "Day" : "");
    const commit = (value: number) => {
      const isNight = value >= 1;
      x = isNight ? 1 : 0;
      velocity = 0;
      moving = false;
      if (checked !== isNight) {
        checked = isNight;
        button.setAttribute("aria-checked", String(isNight));
        cbRef.current.onChange?.(isNight);
      }
      status.textContent = statusText(x);
    };

    const stopDrawing = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const tick = (ms: number) => {
      raf = 0;
      const t = ms / 1000;
      const dt = last ? Math.min(0.05, t - last) : 1 / 60;
      last = t;

      if (drag) {
        const before = x;
        x += (clamp(drag.want) - x) * (1 - Math.exp(-dt * 34));
        velocity = (x - before) / Math.max(dt, 1 / 240);
      } else if (moving) {
        const omega = calm ? 18 : 9.5;
        velocity += (omega * omega * (target - x) - 2 * omega * velocity) * dt;
        x += velocity * dt;
        if (Math.abs(target - x) < 0.0015 && Math.abs(velocity) < 0.03) {
          x = target;
          if (x <= 0 || x >= 1) {
            if (!calm) stretchV -= 3;
            commit(x);
          } else {
            velocity = 0;
            moving = false;
            status.textContent = "";
          }
        }
        x = clamp(x);
      } else velocity = 0;

      if (!calm) {
        const goal = clamp(Math.abs(velocity) * 0.45, 0, 1.2);
        stretchV += (170 * (goal - stretch) - 11 * stretchV) * dt;
        stretch += stretchV * dt;
        lift += (liftT - lift) * (1 - Math.exp(-dt * 14));
      } else {
        stretch = 0;
        stretchV = 0;
        lift = liftT;
      }

      let needWorld = x !== lastX;
      if (!calm) {
        animT += dt;
        worldAcc += dt;
        if (worldAcc >= 1 / 30 - 0.004) {
          needWorld = true;
          worldAcc = 0;
        }
      }
      if (needWorld) {
        frame = world.render(x, animT, calm);
        lastX = x;
        dirty = true;
        if (Math.abs(frame.p - lastP) > 0.002) {
          lastP = frame.p;
          cbRef.current.onPhase?.(frame.p);
        }
      }
      if (!calm && (Math.abs(stretch) > 0.002 || Math.abs(stretchV) > 0.01 || Math.abs(liftT - lift) > 0.002)) {
        dirty = true;
      }
      if (dirty) {
        draw();
        dirty = false;
      }

      const idleCalm = calm && !moving && !drag;
      if (visible && !document.hidden && !idleCalm) raf = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!raf && visible && !document.hidden) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    // ---- input
    const beginDrag = (e: PointerEvent) => {
      if (e.button !== 0) return;
      moving = false;
      drag = {
        id: e.pointerId,
        start: e.clientX,
        from: x,
        want: x,
        moved: false,
        lastX: e.clientX,
        lastT: performance.now(),
        speed: 0,
      };
      liftT = 1;
      try {
        button.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture is optional */
      }
      wake();
    };
    const moveDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.start;
      if (Math.abs(dx) > 3) drag.moved = true;
      drag.want = drag.from + dx / Math.max(L.travelCss, 1);
      const now = performance.now();
      const dtMs = Math.max(now - drag.lastT, 4);
      const sp = (e.clientX - drag.lastX) / Math.max(L.travelCss, 1) / (dtMs / 1000);
      drag.speed = drag.speed * 0.6 + sp * 0.4;
      drag.lastX = e.clientX;
      drag.lastT = now;
      wake();
    };
    const endDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const wasMoved = drag.moved;
      const speed = drag.speed;
      drag = null;
      liftT = 0;
      if (wasMoved) {
        suppressClick = performance.now() + 300;
        target = x + speed * 0.09 >= 0.5 ? 1 : 0;
        velocity = clamp(speed, -3, 3);
        moving = true;
      }
      wake();
    };
    const toggle = () => {
      target = (moving ? target >= 0.5 : x >= 0.5) ? 0 : 1;
      moving = true;
      wake();
    };
    const onClick = () => {
      if (performance.now() < suppressClick) return;
      toggle();
    };
    const onKey = (e: KeyboardEvent) => {
      let next: number | null = null;
      const from = moving ? target : x;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = clamp(from + 0.1);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clamp(from - 0.1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = 1;
      if (next === null) return;
      e.preventDefault();
      target = next;
      moving = true;
      wake();
    };

    button.addEventListener("pointerdown", beginDrag);
    button.addEventListener("pointermove", moveDrag);
    button.addEventListener("pointerup", endDrag);
    button.addEventListener("pointercancel", endDrag);
    button.addEventListener("lostpointercapture", endDrag);
    button.addEventListener("click", onClick);
    button.addEventListener("keydown", onKey);

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((en) => en.isIntersecting);
      if (visible) {
        dirty = true;
        wake();
      } else stopDrawing();
    });
    io.observe(root);
    const onVis = () => {
      if (document.hidden) stopDrawing();
      else {
        dirty = true;
        wake();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const ro = new ResizeObserver(() => {
      measure();
      dirty = true;
      wake();
    });
    ro.observe(root);
    const onMotion = () => {
      calm = motionQ.matches;
      lastX = -1;
      dirty = true;
      wake();
    };
    motionQ.addEventListener("change", onMotion);

    measure();
    frame = world.render(x, 0, calm);
    lastP = frame.p;
    cbRef.current.onPhase?.(frame.p);
    status.textContent = "Day";
    draw();
    wake();

    return () => {
      stopDrawing();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      motionQ.removeEventListener("change", onMotion);
      button.removeEventListener("pointerdown", beginDrag);
      button.removeEventListener("pointermove", moveDrag);
      button.removeEventListener("pointerup", endDrag);
      button.removeEventListener("pointercancel", endDrag);
      button.removeEventListener("lostpointercapture", endDrag);
      button.removeEventListener("click", onClick);
      button.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("relative block select-none", className)}
      style={{
        width: "min(100%, calc((100vh - 230px) * 1.6439))",
        minWidth: "min(100%, 320px)",
        aspectRatio: "1.6439",
      }}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 block h-full w-full" />
      <button
        ref={buttonRef}
        type="button"
        role="switch"
        aria-checked="false"
        aria-label={label}
        className="absolute m-0 cursor-grab touch-pan-y rounded-full border-0 bg-transparent p-0 outline-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
        style={{
          top: "12.121%",
          left: "7.373%",
          width: "85.253%",
          height: "75.758%",
          WebkitTapHighlightColor: "transparent",
        }}
      />
      <span ref={statusRef} role="status" aria-live="polite" className="sr-only" />
    </div>
  );
}
