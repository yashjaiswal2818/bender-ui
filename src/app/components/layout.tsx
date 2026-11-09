import { Sidebar, SidebarBar } from '@/components/sidebar';
import { COMPONENTS, GROUPS } from '@/lib/catalog';

/** The rail lives here, so it stays put (and keeps its filter and open categories) as you move between components. */
export default function ComponentsLayout({ children }: LayoutProps<'/components'>) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:grid lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-14">
      <SidebarBar groups={GROUPS} total={COMPONENTS.length} />
      <Sidebar groups={GROUPS} total={COMPONENTS.length} />
      <div className="min-w-0 py-(--band-y)">{children}</div>
    </div>
  );
}
