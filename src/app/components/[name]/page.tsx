import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';
import { COMPONENTS, getComponent } from '@/lib/catalog';
import { DEMOS } from '@/lib/demos';
import { componentHref } from '@/lib/site';
import { CN_UTILS, CODE_PALETTE, getSource } from '@/lib/source';
import { Showcase } from '@/components/showcase';
import { Install } from '@/components/install';
import { ApiTables } from '@/components/api-tables';
import { PromptButton } from '@/components/prompt-button';
import { JumpLink } from '@/components/jump-link';

type Props = PageProps<'/components/[name]'>;

export function generateStaticParams() {
  return COMPONENTS.map(({ name }) => ({ name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const c = getComponent(name);
  if (!c) return { title: 'Component not found' };
  return { title: c.title, description: c.description };
}

export default async function ComponentPage({ params }: Props) {
  const { name } = await params;
  const at = COMPONENTS.findIndex((c) => c.name === name);
  const c = COMPONENTS[at];
  const source = getSource(name);
  const loadDemo = DEMOS[name];
  if (!c || !source || !loadDemo) notFound();
  // Only this component's demo is loaded for this page, however many components there are.
  const { default: Demo } = await loadDemo();
  const prev = COMPONENTS[at - 1];
  const next = COMPONENTS[at + 1];

  return (
    <article>
      <div className="pb-(--band-y)">
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-[13.5px] text-ink-3">
          <Link href="/components" className="transition-colors hover:text-ink">
            Components
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink-2">{c.category}</span>
        </nav>

        <header>
          <h1 className="display rise text-[clamp(2.6rem,5vw,4rem)]">{c.title}</h1>
          <p className="rise mt-3 max-w-[62ch] text-[16px] leading-relaxed text-ink-2" style={{ '--d': '0.08s' } as React.CSSProperties}>
            {c.description}
          </p>
          <div className="rise mt-6 flex flex-wrap items-center gap-x-5 gap-y-3" style={{ '--d': '0.14s' } as React.CSSProperties}>
            <PromptButton
              name={c.name}
              title={c.title}
              description={c.description}
              dependencies={c.dependencies}
              usesCn={source.usesCn}
              files={source.files}
              demo={source.demo}
              api={source.api}
            />
            <JumpLink to="install" className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink">
              Install
              <ArrowDown size={15} aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5" />
            </JumpLink>
            <JumpLink to="props" className="group inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink">
              Props
              <ArrowDown size={15} aria-hidden className="transition-transform duration-300 group-hover:translate-y-0.5" />
            </JumpLink>
          </div>
        </header>

        <div className="mt-8">
          <Showcase note={c.note} demo={source.demo} palette={CODE_PALETTE}>
            <Demo />
          </Showcase>
        </div>
      </div>

      <section id="install" aria-labelledby="install-title" className="border-t border-line-2 py-(--band-y)">
        <h2 id="install-title" className="display mb-5 text-[2.2rem]">
          Install
        </h2>
        <Install name={c.name} dependencies={c.dependencies} usesCn={source.usesCn} files={source.files} utils={CN_UTILS} palette={CODE_PALETTE} />
      </section>

      <section id="props" aria-labelledby="props-title" className="border-t border-line-2 py-(--band-y)">
        <h2 id="props-title" className="display mb-5 text-[2.2rem]">
          Props
        </h2>
        <ApiTables api={source.api} />
      </section>

      <nav aria-label="More components" className="grid gap-3 border-t border-line-2 pt-(--band-y) sm:grid-cols-2">
        {prev ? (
          <Link
            href={componentHref(prev.name)}
            className="group flex flex-col gap-1 rounded-[20px] border border-line bg-surface px-5 py-4 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-2"
          >
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
              <ArrowLeft size={14} aria-hidden className="transition-transform duration-300 group-hover:-translate-x-0.5" />
              Previous
            </span>
            <span className="font-display text-[18px] font-semibold tracking-[-0.02em] text-ink">{prev.title}</span>
          </Link>
        ) : (
          <span className="max-sm:hidden" />
        )}
        {next && (
          <Link
            href={componentHref(next.name)}
            className="group flex flex-col items-end gap-1 rounded-[20px] border border-line bg-surface px-5 py-4 text-right transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-line-2"
          >
            <span className="inline-flex items-center gap-1.5 text-[13px] text-ink-3">
              Next
              <ArrowRight size={14} aria-hidden className="transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
            <span className="font-display text-[18px] font-semibold tracking-[-0.02em] text-ink">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
