import type { ApiType, CodeLine, ComponentApi } from './source';
import { SITE, registryUrl } from './site';

/** The source back from highlighted lines. */
export const codeText = (lines: CodeLine[]) => lines.map((l) => l.filter((_, i) => i % 2 === 0).join('')).join('\n') + '\n';

function describe(t: ApiType): string {
  if (t.alias) return `- ${t.name} = ${t.alias}${t.doc ? `. ${t.doc}` : ''}`;
  const head = `${t.name}${t.extends ? ` (extends ${t.extends})` : ''}${t.doc ? `: ${t.doc}` : ''}`;
  const rows = (t.props ?? []).map(
    (p) => `  - ${p.name}${p.required ? '' : '?'}: ${p.type}${p.default ? ` = ${p.default}` : ''}${p.doc ? `. ${p.doc}` : ''}`,
  );
  return [`- ${head}`, ...rows].join('\n');
}

export interface PromptInput {
  name: string;
  title: string;
  description: string;
  dependencies: string[];
  usesCn: boolean;
  files: { file: string; lines: CodeLine[] }[];
  demo: { file: string; lines: CodeLine[] };
  api: ComponentApi;
}

/** Everything an AI coding tool needs to add the component, without having to fetch anything. */
export function buildPrompt(o: PromptInput): string {
  const file = o.files[0].file;
  const out = [
    `Add ${o.title} to this project. It's a React component from ${SITE.name}: ${SITE.url}/components/${o.name}`,
    '',
    o.description,
    '',
    'First check that the project has React 18 or newer and Tailwind CSS v4. The classes use v4 syntax, so if it is on Tailwind v3, stop and tell me instead of rewriting them.',
    '',
    '1. Install it.',
    `   If the project has a components.json (shadcn/ui), run: npx shadcn@latest add ${registryUrl(o.name)}`,
    `   Otherwise, install ${o.dependencies.join(' and ')} with the project's package manager and save the code below as components/ui/${file}.`,
    ...(o.usesCn
      ? ['   It imports `cn` from "@/lib/utils". If the project has no such helper, add one: `twMerge(clsx(inputs))`, from the clsx and tailwind-merge packages.']
      : []),
    "2. Match the import paths to the project's aliases.",
    `3. Use it where it fits, following the example below. Replace the sample content (names, copy, photos, prices) with this project's own; keep the structure.`,
    '4. Leave the component file as it is and change it through its props and className, so it can be updated later.',
    '',
    `## API`,
    ...o.api.types.map(describe),
    ...o.api.hooks.map((h) => `- ${h.name}${h.doc ? `: ${h.doc}` : ''}`),
  ];
  for (const f of o.files) out.push('', `## components/ui/${f.file}`, '', '```tsx', codeText(f.lines).trimEnd(), '```');
  out.push('', `## Example (${o.demo.file})`, '', '```tsx', codeText(o.demo.lines).trimEnd(), '```');
  return out.join('\n');
}
