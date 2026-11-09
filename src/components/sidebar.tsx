'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentGroup } from '@/lib/catalog';
import { componentHref } from '@/lib/site';

/** Every component by category. The one you're on is marked with a bar on the rail. */
export function Sidebar({ groups, total }: { groups: ComponentGroup[]; total: number }) {
  const path = usePathname();
  const row = (href: string, label: string, extra?: React.ReactNode) => {
    const on = path === href;
    return (
      <Link
        href={href}
        aria-current={on ? 'page' : undefined}
        className={`relative flex items-center justify-between rounded-lg py-1.5 pl-3.5 pr-2 text-[14.5px] transition-colors ${on ? 'font-medium text-ink' : 'text-ink-2 hover:text-ink'}`}
      >
        {on && <span aria-hidden className="absolute inset-y-1 left-0 w-[2px] rounded-full bg-primary" />}
        {label}
        {extra}
      </Link>
    );
  };

  return (
    <nav aria-label="Components" className="sticky top-24 hidden max-h-[calc(100dvh-7rem)] overflow-y-auto pb-10 lg:block">
      <div className="border-l border-line">
        {row('/components', 'All components', <span className="tabular text-[13px] text-ink-3">{total}</span>)}
        {groups.map((g) => (
          <div key={g.category} className="mt-6">
            <p className="pl-3.5 text-[13px] text-ink-3">{g.category}</p>
            <div className="mt-1">{g.items.map((i) => <div key={i.name}>{row(componentHref(i.name), i.title)}</div>)}</div>
          </div>
        ))}
      </div>
    </nav>
  );
}
