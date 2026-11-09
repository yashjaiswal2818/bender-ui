'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/**
 * The header and footer wrap every page except the home page, which is one screen with its own navbar and menu.
 * Everything under /components sits in the night scope (see globals.css), header and footer included, so the section is one dark room.
 */
export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const home = path === '/';
  const night = path === '/components' || path.startsWith('/components/');
  return (
    <div className={`flex min-h-dvh flex-1 flex-col bg-bg text-ink ${night ? 'night' : ''}`}>
      {!home && header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {!home && footer}
    </div>
  );
}
