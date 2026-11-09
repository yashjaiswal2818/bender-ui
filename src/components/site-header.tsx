'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SITE } from '@/lib/site';
import { GithubMark } from './github-mark';
import { Logo } from './logo';

const LINKS = [
  { href: '/components', label: 'Components' },
  { href: '/docs', label: 'Docs' },
] as const;

/** The header of every page except the home page, which has its own navbar and the Tuck Menu (see home-shell.tsx). */
export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-40 border-b border-line-2 bg-bg/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-4 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 whitespace-nowrap font-display text-[18px] font-semibold tracking-[-0.03em] text-ink sm:text-[19px]">
          <Logo size={26} />
          <span>{SITE.name}</span>
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 sm:gap-2">
          {LINKS.map((l) => {
            const on = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={on ? 'page' : undefined}
                className={`rounded-lg px-2.5 py-1.5 text-[14px] transition-colors sm:px-3 sm:py-2 sm:text-[14.5px] ${on ? 'bg-tile font-medium text-ink' : 'text-ink-2 hover:bg-tile hover:text-ink'}`}
              >
                {l.label}
              </Link>
            );
          })}
          <a
            href={SITE.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub repository"
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[14px] text-ink-2 transition-colors hover:bg-tile hover:text-ink sm:px-3 sm:py-2 sm:text-[14.5px]"
          >
            <GithubMark size={16} />
            <span className="max-sm:hidden">GitHub</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
