import type { MetadataRoute } from 'next';
import { COMPONENTS } from '@/lib/catalog';
import { SITE, componentHref } from '@/lib/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/components', '/docs', ...COMPONENTS.map((c) => componentHref(c.name))];
  return paths.map((p) => ({ url: `${SITE.url}${p === '/' ? '' : p}` }));
}
