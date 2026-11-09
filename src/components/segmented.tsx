'use client';

import { useId } from 'react';
import { motion } from 'motion/react';

/** A row of tabs on a sunken track; the raised one slides to the choice. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  const uid = useId();
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-[14px] bg-bg-2 p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={`relative rounded-[10px] px-4 py-1.5 text-[13.5px] transition-colors duration-300 ${on ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}
          >
            {on && (
              <motion.span
                layoutId={`${uid}-on`}
                transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                aria-hidden
                className="absolute inset-0 rounded-[10px] bg-surface shadow-[0_1px_2px_rgb(17_17_17/0.06),0_2px_8px_-4px_rgb(17_17_17/0.12)]"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
