/* eslint-disable @next/next/no-img-element -- fixed local stills with known sizes */
import Link from 'next/link';
import { previewSrc, type Component } from '@/lib/catalog';
import { componentHref } from '@/lib/site';

/** A still of the live demo, its name and one sentence. The page behind it is the live one. */
export function ComponentCard({ c, wide = false, position, priority = false }: { c: Component; wide?: boolean; position?: string; priority?: boolean }) {
  return (
    <Link href={componentHref(c.name)} className={`group flex min-w-0 flex-col ${wide ? 'lg:col-span-2' : ''}`}>
      <div className={`relative aspect-[4/3] overflow-hidden rounded-[22px] bg-tile ring-1 ring-line ${wide ? 'lg:aspect-[2.75/1]' : ''}`}>
        <img
          src={previewSrc(c.name)}
          width={1000}
          height={750}
          alt={`${c.title}: ${c.blurb}`}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] ease-[var(--ease-out)] group-hover:scale-[1.03]"
          style={{ objectPosition: position }}
        />
      </div>
      <div className="mt-3.5 flex items-baseline justify-between gap-3 px-0.5">
        <h3 className="font-display text-[19px] font-semibold tracking-[-0.02em]">{c.title}</h3>
        <span className="shrink-0 text-[13px] text-ink-3">{c.category}</span>
      </div>
      <p className="mt-1 max-w-[52ch] px-0.5 text-[14.5px] leading-relaxed text-ink-2">{c.blurb}</p>
    </Link>
  );
}
