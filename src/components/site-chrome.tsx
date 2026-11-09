'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** The header and footer wrap every page except the home page, which is one screen with its own navbar and menu. */
export function SiteChrome({ header, footer, children }: { header: ReactNode; footer: ReactNode; children: ReactNode }) {
  const home = usePathname() === '/';
  return (
    <>
      {!home && header}
      <main id="main" className="flex-1">
        {children}
      </main>
      {!home && footer}
    </>
  );
}
