'use client';

import { glideTo } from '@/lib/glide';

/**
 * A link to a section of the same page that glides there. It looks the section up inside its own `<article>`, because
 * Next keeps recently visited pages in the DOM (hidden), so the same id can exist twice.
 */
export function JumpLink({ to, className, children }: { to: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href={`#${to}`}
      className={className}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const el = e.currentTarget.closest('article')?.querySelector(`#${to}`);
        if (!el) return;
        e.preventDefault();
        history.replaceState(null, '', `#${to}`);
        glideTo(el);
      }}
    >
      {children}
    </a>
  );
}
