// Builds everything the site needs from registry/components/<name>/ :
//   public/r/<name>.json     a shadcn registry item, so `npx shadcn@latest add <url>` installs it
//   public/r/registry.json   the registry index, for `"registries": { "@bender": "…/r/{name}.json" }` in components.json
//   src/generated/sources.json   the source, the demo as a usage example, highlighted lines and the props, for the site
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createHighlighter } from 'shiki';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const site = JSON.parse(fs.readFileSync(path.join(root, 'site.config.json'), 'utf8'));
const THEME = 'vitesse-light';

/** shadcn/ui's `cn`, for projects that don't have it yet. */
const CN = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

const pascal = (name) => name.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
const squash = (s) => s.replace(/\s+/g, ' ').trim();

/** `/** text *\/` above a node, as plain text. */
function docOf(node, src) {
  const ranges = ts.getLeadingCommentRanges(src, node.pos) ?? [];
  const doc = ranges.map((r) => src.slice(r.pos, r.end)).filter((c) => c.startsWith('/**')).pop();
  if (!doc) return '';
  return squash(
    doc
      .replace(/^\/\*\*|\*\/$/g, '')
      .split('\n')
      .map((l) => l.replace(/^\s*\* ?/, ''))
      .join(' '),
  );
}

/** Props of the main component, then every other exported type, read straight from the source. */
function readApi(name, src) {
  const sf = ts.createSourceFile(`${name}.tsx`, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const exported = (n) => n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  const main = pascal(name);
  const defaults = {};
  let propsType = `${main}Props`;
  const types = [];
  const hooks = [];

  for (const node of sf.statements) {
    if (ts.isFunctionDeclaration(node) && exported(node) && node.name) {
      if (node.name.text === main) {
        const param = node.parameters[0];
        if (param && ts.isObjectBindingPattern(param.name)) {
          for (const el of param.name.elements) {
            if (el.initializer) defaults[(el.propertyName ?? el.name).getText(sf)] = squash(el.initializer.getText(sf));
          }
        }
        if (param?.type && ts.isTypeReferenceNode(param.type)) propsType = param.type.typeName.getText(sf);
      } else if (/^use[A-Z]/.test(node.name.text)) {
        hooks.push({ name: `${node.name.text}()`, doc: docOf(node, src) });
      }
    }
    if (ts.isVariableStatement(node) && exported(node)) {
      for (const d of node.declarationList.declarations) {
        const id = d.name.getText(sf);
        if (/^use[A-Z]/.test(id)) hooks.push({ name: `${id}()`, doc: docOf(node, src) });
      }
    }
    if (ts.isInterfaceDeclaration(node) && exported(node)) {
      types.push({
        name: node.name.text,
        doc: docOf(node, src),
        extends: node.heritageClauses?.map((h) => squash(h.types.map((t) => t.getText(sf)).join(', '))).join(', ') || undefined,
        props: node.members
          .filter((m) => ts.isPropertySignature(m) || ts.isMethodSignature(m))
          .map((m) => ({
            name: m.name.getText(sf),
            type: squash(m.type ? m.type.getText(sf) : ts.isMethodSignature(m) ? '(…) => void' : 'unknown'),
            required: !m.questionToken,
            doc: docOf(m, src),
          })),
      });
    }
    if (ts.isTypeAliasDeclaration(node) && exported(node)) {
      types.push({ name: node.name.text, doc: docOf(node, src), alias: squash(node.type.getText(sf)) });
    }
  }

  // Defaults belong to the main props only.
  const props = types.find((t) => t.name === propsType);
  if (props?.props) for (const p of props.props) if (p.name in defaults) p.default = defaults[p.name];
  types.sort((a, b) => (a.name === propsType ? -1 : b.name === propsType ? 1 : 0));
  return { component: main, propsType, types, hooks };
}

/**
 * Highlighted lines in a compact form: each line is `[text, colour, text, colour, …]`, where colour indexes `palette`
 * (-1 is the plain text colour). Joining the texts gives the source back, so it isn't stored twice.
 */
function highlighter(hl, palette) {
  return (code, lang) => {
    const { tokens, fg } = hl.codeToTokens(code.replace(/\n$/, ''), { lang, theme: THEME });
    return tokens.map((line) => {
      const out = [];
      for (const t of line) {
        const color = (t.color ?? fg).toLowerCase();
        const plain = color === fg.toLowerCase();
        let c = plain ? -1 : palette.indexOf(color);
        if (!plain && c === -1) c = palette.push(color) - 1;
        // Spaces take whatever colour came before them, so neighbours merge.
        if (out.length && (out[out.length - 1] === c || !t.content.trim())) out[out.length - 2] += t.content;
        else out.push(t.content, c);
      }
      return out;
    });
  };
}

// ── Checks ──────────────────────────────────────────────────────────────
// A component is a folder and nothing else, so this is where a bad one is stopped: before it is installed
// into someone's project (it would not compile there) or published (it carries something private).
const REQUIRED = ['name', 'title', 'category', 'description', 'blurb'];
const PEER = new Set(['react', 'react-dom']);
const pkgOf = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);
const importsOf = (code) => {
  const found = [];
  const re = /(?:import|export)\s[^'"`;]*?from\s*['"]([^'"]+)['"]|import\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;
  for (const m of code.matchAll(re)) found.push(m[1] ?? m[2] ?? m[3]);
  return found;
};
/** Never allowed in a file that ships: each of these means something local or private got in. */
const LEAKS = [
  [/\/Users\/|\/home\/[a-z][\w-]*\/|[A-Za-z]:\\Users\\/, 'an absolute path on a local machine'],
  [/process\.env|import\.meta\.env/, 'an environment variable (a copy would read the visitor’s, not yours)'],
  [/sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'something shaped like a secret'],
];
const EMAIL = /[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z0-9.-]*[A-Za-z]/g;

const problems = [];
const warnings = [];

/** Reads and checks one component folder; returns it, or null when it can't be used. */
function load(name, dir) {
  const fail = (msg) => problems.push(`${name}: ${msg}`);
  const metaFile = path.join(dir, 'meta.json');
  if (!fs.existsSync(metaFile)) return fail('no meta.json') ?? null;
  let meta;
  try {
    meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  } catch (err) {
    return fail(`meta.json is not valid JSON (${err.message})`) ?? null;
  }
  const before = problems.length;
  for (const k of REQUIRED) if (typeof meta[k] !== 'string' || !meta[k].trim()) fail(`meta.json needs a "${k}" string`);
  if (meta.name !== name) fail(`meta.json name "${meta.name}" must match the folder name "${name}"`);
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) fail('the folder name must be kebab-case (letters, digits, dashes)');
  if (!Array.isArray(meta.dependencies)) fail('meta.json needs a "dependencies" array (it can be empty)');
  if (!Array.isArray(meta.files) || !meta.files.length) fail('meta.json needs a non-empty "files" array');
  if (typeof meta.demo !== 'string') fail('meta.json needs a "demo" file name');
  if (meta.order !== undefined && typeof meta.order !== 'number') fail('"order" must be a number');
  if (problems.length > before) return null;

  const stems = new Set(meta.files.map((f) => f.replace(/\.tsx?$/, '')));
  const dependencies = new Set([...PEER, ...meta.dependencies.map(pkgOf)]);
  for (const f of [...meta.files, meta.demo]) {
    const file = path.join(dir, f);
    if (!fs.existsSync(file)) {
      fail(`${f} is listed in meta.json but is not in the folder`);
      continue;
    }
    const code = fs.readFileSync(file, 'utf8');
    for (const [re, what] of LEAKS) if (re.test(code)) fail(`${f} contains ${what}`);
    for (const email of new Set(code.match(EMAIL) ?? [])) warnings.push(`${name}/${f}: "${email}". Fine if it is made up for the demo, otherwise remove it.`);
    for (const spec of importsOf(code)) {
      if (spec.startsWith('.')) {
        if (!stems.has(spec.replace(/^\.\//, '').replace(/\.tsx?$/, ''))) fail(`${f} imports "${spec}", which is not one of the listed files, so a copy would break`);
      } else if (spec.startsWith('@/')) {
        if (spec !== '@/lib/utils') fail(`${f} imports "${spec}"; a copy only has "@/lib/utils" to rely on`);
      } else if (f !== meta.demo && !dependencies.has(pkgOf(spec))) {
        // The demo is only a usage example shown on the site; it is never installed, so only shipped files are held to this.
        fail(`${f} imports "${spec}", but "${pkgOf(spec)}" is not in meta.json "dependencies", so the install would not add it`);
      }
    }
  }
  if (!fs.existsSync(path.join(root, 'public', 'previews', `${name}.webp`))) warnings.push(`${name}: no public/previews/${name}.webp, so its card will show a broken image.`);
  return { name, dir, meta };
}

const source = path.join(root, 'registry', 'components');
const rOut = path.join(root, 'public', 'r');
const gOut = path.join(root, 'src', 'generated');

// Every folder in registry/components is a component. The order is meta.json "order", then the name.
const components = fs
  .readdirSync(source, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => load(e.name, path.join(source, e.name)))
  .filter(Boolean)
  .sort((a, b) => (a.meta.order ?? 1e6) - (b.meta.order ?? 1e6) || a.name.localeCompare(b.name));

for (const w of warnings) console.warn(`warning  ${w}`);
if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length === 1 ? '' : 's'} in registry/components:\n${problems.map((p) => `  ✗ ${p}`).join('\n')}\n`);
  process.exit(1);
}

fs.rmSync(rOut, { recursive: true, force: true });
fs.mkdirSync(rOut, { recursive: true });
fs.mkdirSync(gOut, { recursive: true });

const hl = await createHighlighter({ themes: [THEME], langs: ['tsx', 'bash'] });
const palette = [];
const highlight = highlighter(hl, palette);
const index = [];
const sources = {};

for (const { name, dir, meta } of components) {
  const files = meta.files.map((f) => ({ file: f, code: fs.readFileSync(path.join(dir, f), 'utf8') }));
  const usesCn = files.some((f) => f.code.includes('@/lib/utils'));

  // The demo imports the component from next to it and assets from this site; a copy should work anywhere.
  let demo = fs.readFileSync(path.join(dir, meta.demo), 'utf8');
  for (const f of meta.files) {
    const stem = f.replace(/\.tsx?$/, '');
    demo = demo.replaceAll(`from "./${stem}"`, `from "@/components/ui/${stem}"`);
  }
  demo = demo.replace(/(["'(])\/own\//g, `$1${site.url}/own/`);

  const item = {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name,
    type: 'registry:ui',
    title: meta.title,
    description: meta.description,
    author: `${site.name} <${site.url}>`,
    dependencies: meta.dependencies,
    registryDependencies: usesCn ? ['utils'] : [],
    categories: [meta.category.toLowerCase()],
    files: files.map((f) => ({ path: `registry/${site.namespace}/${f.file}`, type: 'registry:ui', content: f.code })),
  };
  fs.writeFileSync(path.join(rOut, `${name}.json`), JSON.stringify(item, null, 2));
  index.push({ ...item, $schema: undefined, files: item.files.map(({ path: p, type }) => ({ path: p, type })) });

  sources[name] = {
    files: files.map((f) => ({ file: f.file, lines: highlight(f.code, 'tsx') })),
    demo: { file: `${name}-demo.tsx`, lines: highlight(demo, 'tsx') },
    usesCn,
    api: readApi(name, files[0].code),
  };
}

fs.writeFileSync(
  path.join(rOut, 'registry.json'),
  JSON.stringify({ $schema: 'https://ui.shadcn.com/schema/registry.json', name: site.namespace, homepage: site.url, items: index }, null, 2),
);
fs.writeFileSync(path.join(gOut, 'sources.json'), JSON.stringify({ palette, utils: { file: 'lib/utils.ts', lines: highlight(CN, 'tsx') }, sources }));

// What the site lists, in order (the catalog reads this), and one lazy loader per demo so a page only ever loads its own.
fs.writeFileSync(
  path.join(gOut, 'components.json'),
  JSON.stringify(
    components.map(({ meta }) => ({
      name: meta.name,
      title: meta.title,
      category: meta.category,
      description: meta.description,
      blurb: meta.blurb,
      ...(meta.note ? { note: meta.note } : {}),
      dependencies: meta.dependencies,
    })),
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(gOut, 'demos.ts'),
  `// Built by scripts/build-registry.mjs. Do not edit.
import type { ComponentType } from 'react';

export type DemoLoader = () => Promise<{ default: ComponentType }>;

export const DEMOS: Record<string, DemoLoader> = {
${components.map(({ name, meta }) => `  '${name}': () => import('@registry/components/${name}/${meta.demo.replace(/\.tsx?$/, '')}'),`).join('\n')}
};
`,
);
hl.dispose();
console.log(`built ${index.length} registry item${index.length === 1 ? '' : 's'} → public/r, src/generated`);
