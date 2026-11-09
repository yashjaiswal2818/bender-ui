import config from '../../site.config.json';

/** Name, URL and links, from site.config.json (the registry builder reads the same file). */
export const SITE = config;

/** Where a component's registry item is served from (`public/r`, built by scripts/build-registry.mjs). */
export const registryUrl = (name: string) => `${SITE.url}/r/${name}.json`;
export const componentHref = (name: string) => `/components/${name}`;

/** The one command that works in any project with a components.json. */
export const addCommand = (name: string) => `npx shadcn@latest add ${registryUrl(name)}`;
