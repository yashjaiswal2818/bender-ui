// The list of components, without their demos, so pages that only list them stay light.
// Nothing to edit here: scripts/build-registry.mjs reads every folder in registry/components/
// and writes src/generated/components.json (in meta.json "order", then by name).
import list from '@/generated/components.json';

export interface Component {
  name: string;
  title: string;
  category: string;
  description: string;
  /** One sentence for lists and cards. */
  blurb: string;
  /** What to try first, shown next to the demo. */
  note?: string;
  dependencies: string[];
}

/** In the order they are shown. */
export const COMPONENTS: Component[] = list;

export const getComponent = (name: string) => COMPONENTS.find((c) => c.name === name);

/** A still of the live demo, for lists. */
export const previewSrc = (name: string) => `/previews/${name}.webp`;

export interface ComponentGroup {
  category: string;
  items: { name: string; title: string }[];
}

/** Components by category, in list order. */
export const GROUPS = COMPONENTS.reduce<ComponentGroup[]>((groups, { category, name, title }) => {
  const group = groups.find((g) => g.category === category);
  if (group) group.items.push({ name, title });
  else groups.push({ category, items: [{ name, title }] });
  return groups;
}, []);
