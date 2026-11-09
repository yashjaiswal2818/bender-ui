"use client";

import { useCallback, useRef, useState } from "react";
import { DaylightToggle } from "./daylight-toggle";
import { pageColors, phaseLabel } from "./harbour";

export default function DaylightToggleDemo() {
  const pageRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("Midday");

  const onPhase = useCallback((p: number) => {
    const el = pageRef.current;
    if (el) {
      const c = pageColors(p);
      el.style.setProperty("--page-bg", c.bg);
      el.style.setProperty("--page-glow", c.glow);
      el.style.setProperty("--page-fg", c.fg);
      el.style.setProperty("--page-muted", c.muted);
    }
    const next = phaseLabel(p);
    setLabel((prev) => (prev === next ? prev : next));
  }, []);

  return (
    <div
      ref={pageRef}
      className="relative flex min-h-[500px] flex-col items-center justify-center gap-6 overflow-hidden rounded-[20px] px-6 py-10 transition-colors duration-300"
      style={{
        background: "radial-gradient(ellipse at 50% 45%, var(--page-glow, #fbf4e2), var(--page-bg, #efe5cf) 72%)",
        color: "var(--page-fg, #2a2a3a)",
      }}
    >
      <header className="text-center">
        <p className="text-xs font-semibold tracking-[0.35em] uppercase" style={{ color: "var(--page-muted, #6c6a78)" }}>
          Harbour Light
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">{label}</h3>
      </header>

      <div className="w-full max-w-[440px]">
        <DaylightToggle onPhase={onPhase} label="Night mode" />
      </div>

      <p className="max-w-sm text-center text-[13.5px] leading-relaxed" style={{ color: "var(--page-muted, #6c6a78)" }}>
        Drag the brass lens across the bay, or click it. The cat on the pier will tell you when it's late.
      </p>
    </div>
  );
}
