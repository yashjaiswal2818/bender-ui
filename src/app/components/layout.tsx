import { Sidebar } from '@/components/sidebar';
import { COMPONENTS, GROUPS } from '@/lib/catalog';

export default function ComponentsLayout({ children }: LayoutProps<'/components'>) {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-(--band-y) sm:px-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-14">
      <Sidebar groups={GROUPS} total={COMPONENTS.length} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
