import Link from 'next/link';
import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="border-t border-line-2">
      <div className="band-in flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-[14px] text-ink-3">
        <p>
          From the makers of{' '}
          <a href={SITE.maker.url} className="text-ink-2 underline decoration-line-2 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink">
            {SITE.maker.name}
          </a>
          . MIT licensed, so take what you need.
        </p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/components" className="transition-colors hover:text-ink">
            Components
          </Link>
          <Link href="/docs" className="transition-colors hover:text-ink">
            Docs
          </Link>
          <a href={SITE.github} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
