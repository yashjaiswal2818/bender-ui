# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Frontend developers building React + Tailwind v4 sites and apps, often already on shadcn/ui, who want a polished, interactive piece (a menu, a pricing block, a testimonial wall) and would rather see it work on the page than read about it. They have an editor open next to the browser and a terminal one tab away. *(Inferred from the README and the install mechanism; not yet confirmed with real users.)*

## Product Purpose

Bender UI is an open-source (MIT) library of curated React components. A visitor tries a component live on its page, copies one command (`npx shadcn@latest add <registry url>`), and the code lands in their own `components/ui` folder. From then on it is their code: no package to keep up with, nothing to uninstall. Every component page carries the live demo, the install command, the source, a props table, and one prompt a visitor can hand to their AI.

Success: a developer goes from "I saw it move" to "it is in my project" in under a minute, and the library stays small and good as it grows past 50 components.

## Positioning

Curated, not comprehensive. Each component is hand-built, runs live on the site, and ships with an AI-ready prompt generated from its real source and props. The library grows by dropping in one folder per component, so growth never costs the site its structure or its quality bar.

## Operating Context

- Distribution is the shadcn registry format: every component is a JSON file under `/r/<name>.json`, installable by URL or, after a one-time `components.json` entry, by `@bender/<name>`.
- The site is built from the registry folder itself (`registry/components/<name>/`): the live demo, highlighted source, props table and install JSON are all generated from it, so the page can never drift from the code that ships.
- Open source: the repository is public. Nothing private (keys, internal URLs, personal paths, internal product names) may enter it.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router), React 19, Tailwind CSS v4, `motion`, `lucide-react`. Installed components may rely only on React, `motion`, `lucide-react`, and the `cn` helper at `@/lib/utils`.
- Site is light-only. Demos may ship `dark:` styles, which apply only inside an explicit `.dark` scope.
- Bender UI is **independent of get-ui**. The "Our components" section in the sibling `get-ui` project is separate and is being removed from there by the maintainer; nothing in this repository depends on `get-ui`.
- Deploy target and domain: `site.config.json` says `https://ui.benderai.app`. Not yet confirmed as live.
- Photos in demos are Unsplash (linked, not bundled); provider logos are LobeHub Icons (MIT). See `NOTICE.md`.

## Brand Commitments

- Name: **Bender UI**. Maker credit stays: "From the makers of Bender", where Bender turns a prompt into real mobile app screens you can edit and ship as code.
- The existing look (white page, cool ink, one cobalt, a sky-blue stage under demos, Bricolage Grotesque headlines, flat surfaces) was confirmed by the maintainer on 2026-11-09 as the identity to keep. It is recorded in `DESIGN.md`.

## Evidence on Hand

- Eight finished components in `registry/components/`, each with a live demo and a still preview in `public/previews/`.
- **Absent, and must not be invented:** GitHub stars, download counts, user quotes, customer logos, benchmarks, press, sponsors.

## Product Principles

1. **Show, don't link.** The component is the content. Every page opens on the live thing.
2. **One command to take it.** Anything beyond copy-and-paste is friction to remove.
3. **Few and good beats many.** Curation is the product. A new component earns its place; it does not just add to the count.
4. **Structure scales, hand-edits don't.** Adding a component touches one folder and nothing else.
5. **The repo is public.** Treat every file as already published.

## Accessibility & Inclusion

No formal standard has been set. Existing practice to preserve: skip link, visible keyboard focus, `prefers-reduced-motion` respected, demos usable by keyboard.
