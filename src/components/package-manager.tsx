'use client';

import { useId, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { CopyButton } from './copy-button';

export const PMS = ['pnpm', 'npm', 'yarn', 'bun'] as const;
export type Pm = (typeof PMS)[number];

// One choice for the whole page (and the next visit), so every command switches together.
const KEY = 'bender-pm';
const listeners = new Set<() => void>();
let chosen: Pm | null = null;
const read = (): Pm => {
  if (chosen) return chosen;
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (PMS as readonly string[]).includes(saved)) return (chosen = saved as Pm);
  } catch {}
  return (chosen = 'npm');
};
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const choose = (pm: Pm) => {
  chosen = pm;
  try {
    localStorage.setItem(KEY, pm);
  } catch {}
  listeners.forEach((l) => l());
};

export const usePm = () => useSyncExternalStore(subscribe, read, () => 'npm' as Pm);

/** A command with a package-manager switch above it. */
export function PmCommand({ command }: { command: (pm: Pm) => string }) {
  const pm = usePm();
  const uid = useId();
  const text = command(pm);
  return (
    <div className="overflow-clip rounded-[16px] border border-line bg-surface">
      <div className="flex items-center gap-1 border-b border-line py-1.5 pl-1.5 pr-1.5">
        <div role="tablist" aria-label="Package manager" className="flex">
          {PMS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              aria-selected={p === pm}
              onClick={() => choose(p)}
              className={`relative rounded-[9px] px-2.5 py-1 font-mono text-[12.5px] transition-colors ${p === pm ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              {p === pm && (
                <motion.span
                  layoutId={`${uid}-pm`}
                  transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
                  aria-hidden
                  className="absolute inset-0 rounded-[9px] bg-tile ring-1 ring-line ring-inset"
                />
              )}
              <span className="relative">{p}</span>
            </button>
          ))}
        </div>
        <CopyButton text={text} className="ml-auto" />
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[13px] leading-relaxed text-ink">
        <span className="select-none text-ink-3">$ </span>
        {text}
      </pre>
    </div>
  );
}
