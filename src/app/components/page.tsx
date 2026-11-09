import type { Metadata } from 'next';
import { ComponentCard } from '@/components/component-card';
import { COMPONENTS } from '@/lib/catalog';

export const metadata: Metadata = {
  title: 'Components',
  description: 'Every Bender UI component, live. Open one to try it, then take its code, its props or a prompt for your AI.',
};

export default function ComponentsPage() {
  return (
    <>
      <header className="pb-(--band-y)">
        <h1 className="display rise text-[clamp(2.4rem,4.6vw,3.6rem)]">Components</h1>
        <p className="rise mt-3 max-w-[56ch] text-[17px] leading-[1.6] text-ink-2" style={{ '--d': '0.08s' } as React.CSSProperties}>
          Open one to try it on the page. Every component comes with its code, its props, and one prompt you can hand to your AI.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-x-6 gap-y-10 border-t border-line-2 pt-(--band-y) sm:grid-cols-2 xl:grid-cols-3">
        {COMPONENTS.map((c, i) => (
          <ComponentCard key={c.name} c={c} priority={i < 3} />
        ))}
      </div>
    </>
  );
}
