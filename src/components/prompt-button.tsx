'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, MessageSquareCode } from 'lucide-react';
import { buildPrompt, type PromptInput } from '@/lib/prompt';

/** Copies one prompt with the code, the props and an example, for Cursor, Claude Code or any AI tool. */
export function PromptButton(props: PromptInput) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt(props));
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2400);
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-11 items-center gap-2.5 rounded-[14px] border border-line bg-surface pl-3.5 pr-4 text-[14px] font-medium text-ink transition-[border-color,background-color] duration-300 hover:border-line-2 hover:bg-tile"
    >
      <span className="relative grid size-4 place-items-center text-primary">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? 'y' : 'n'}
            initial={{ scale: 0.4, opacity: 0, rotate: -30 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
            className="grid"
          >
            {copied ? <Check size={16} strokeWidth={2.4} className="text-ok" aria-hidden /> : <MessageSquareCode size={16} aria-hidden />}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="relative h-5 overflow-hidden" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? 'y' : 'n'}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
            className="block whitespace-nowrap"
          >
            {copied ? 'Copied. Paste it into your AI tool' : 'Copy prompt'}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
