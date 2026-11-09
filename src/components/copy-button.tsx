'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy } from 'lucide-react';

/** Copies `text` (or what it returns, worked out on click) and says so for a moment. */
export function CopyButton({
  text,
  label = 'Copy',
  done = 'Copied',
  className = '',
}: {
  text: string | (() => string);
  label?: string;
  done?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(typeof text === 'function' ? text() : text);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? done : label}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[12.5px] font-medium text-ink-2 transition-colors hover:bg-tile hover:text-ink ${className}`}
    >
      <span className="relative grid size-3.5 place-items-center">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? 'y' : 'n'}
            initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
            className="grid"
          >
            {copied ? <Check size={14} strokeWidth={2.4} className="text-ok" aria-hidden /> : <Copy size={14} aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
