# Bender UI

Open-source React components you can try live on the page, then take with one command. Each one comes with its code, its props and a prompt for your AI.

Live at **https://ui.benderai.app**.

## Add a component to your project

You need React 18+ and Tailwind CSS v4. In a project with a `components.json` (shadcn/ui):

```bash
npx shadcn@latest add https://ui.benderai.app/r/bloom-menu.json
```

Or add the registry once, then install by name. In `components.json`:

```json
"registries": {
  "@bender": "https://ui.benderai.app/r/{name}.json"
}
```

```bash
npx shadcn@latest add @bender/bloom-menu
```

The component is copied into `components/ui`. It's your code from then on.

## Run the site locally

```bash
npm install
npm run dev
```

`npm run dev` and `npm run build` first run `scripts/build-registry.mjs`, which reads `registry/components/*` and writes the shadcn registry to `public/r/` and the highlighted source and props tables to `src/generated/` (both git-ignored).

## Add a component

A component is one folder, and nothing else needs editing:

1. Make `registry/components/<name>/` with `<name>.tsx`, `demo.tsx` and `meta.json` (copy an existing one for the fields). `order` in `meta.json` sets where it appears in lists.
2. Add `public/previews/<name>.webp`, a 1000×750 still of the demo. The cards and the marquee on the home page use it.
3. Write a short JSDoc comment on each prop. It becomes the Props table and the API section of the copy-prompt.
4. Run `npm run dev` (or `npm run registry`). The builder finds the folder, adds it to the site, the sidebar and the registry, and **stops with a clear error** if the component imports something a copy wouldn't have, lists a dependency it doesn't declare, or contains an absolute path, an environment variable or something shaped like a secret.

Components import `cn` from `@/lib/utils` and use `motion/react` and `lucide-react`; nothing else should be needed.

## Licence

MIT, see `LICENSE`. Photos and logos used in demos keep their own terms, see `NOTICE.md`.
