import { HomeShell } from '@/components/home-shell';
import { PageTransition } from '@/components/page-transition';
import { COMPONENTS, previewSrc } from '@/lib/catalog';
import { componentHref } from '@/lib/site';

// The home page: a hero, then a marquee of every component. See components/home-shell.tsx.
export default function Home() {
  return (
    <PageTransition>
      <HomeShell
        items={COMPONENTS.map((c) => ({
          name: c.name,
          title: c.title,
          category: c.category,
          href: componentHref(c.name),
          src: previewSrc(c.name),
        }))}
      />
    </PageTransition>
  );
}
