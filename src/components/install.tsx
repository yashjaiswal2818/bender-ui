'use client';

import { useState } from 'react';
import type { CodeLine } from '@/lib/source';
import { SITE, registryUrl } from '@/lib/site';
import { CodeBlock } from './code-block';
import { PmCommand, type Pm } from './package-manager';
import { Segmented } from './segmented';

const TABS = [
  { value: 'cli', label: 'CLI' },
  { value: 'manual', label: 'Manual' },
] as const;

const DLX: Record<Pm, string> = { pnpm: 'pnpm dlx', npm: 'npx', yarn: 'yarn dlx', bun: 'bunx --bun' };
const ADD: Record<Pm, string> = { pnpm: 'pnpm add', npm: 'npm install', yarn: 'yarn add', bun: 'bun add' };

function Step({ n, title, last, children }: { n: number; title: string; last?: boolean; children?: React.ReactNode }) {
  return (
    <li className={`relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-4 ${last ? '' : 'pb-8'}`}>
      {!last && <span aria-hidden className="absolute bottom-1 left-[13.5px] top-9 w-px bg-line" />}
      <span className="tabular grid size-7 place-items-center rounded-full bg-surface text-[13px] font-semibold text-ink-2 ring-1 ring-line">
        {n}
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-[15px] font-medium text-ink">{title}</p>
        {children && <div className="mt-3 flex flex-col gap-3">{children}</div>}
      </div>
    </li>
  );
}

export function Install({
  name,
  dependencies,
  usesCn,
  files,
  utils,
  palette,
}: {
  name: string;
  dependencies: string[];
  usesCn: boolean;
  files: { file: string; lines: CodeLine[] }[];
  utils: { file: string; lines: CodeLine[] };
  palette: string[];
}) {
  const [tab, setTab] = useState<'cli' | 'manual'>('cli');
  const url = registryUrl(name);
  const written = files.map((f) => `components/ui/${f.file}`).join(', ');
  let n = 0;

  return (
    <div>
      <Segmented label="Install with" value={tab} options={TABS} onChange={setTab} />

      {tab === 'cli' ? (
        <div className="mt-4 flex flex-col gap-3">
          <PmCommand command={(pm) => `${DLX[pm]} shadcn@latest add ${url}`} />
          <p className="max-w-[68ch] text-[13.5px] leading-relaxed text-ink-3">
            Writes <code className="font-mono text-[12.5px] text-ink-2">{written}</code>
            {dependencies.length > 0 && (
              <>
                {' '}and installs <span className="text-ink-2">{dependencies.join(' and ')}</span>
              </>
            )}
            . Works in any project set up with shadcn/ui on Tailwind CSS v4.
          </p>
          <details className="max-w-[68ch] text-[13.5px] text-ink-3">
            <summary className="w-fit cursor-pointer list-none text-ink-2 underline decoration-line-2 underline-offset-4 transition-colors hover:text-ink">
              Or add {SITE.name} as a registry, once
            </summary>
            <div className="mt-3 flex flex-col gap-3 leading-relaxed">
              <p>
                Put this in <code className="font-mono text-[12.5px] text-ink-2">components.json</code>, then install any of our components by name.
              </p>
              <pre className="overflow-x-auto rounded-[14px] border border-line bg-surface px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-2">
                {`"registries": {\n  "@${SITE.namespace}": "${url.replace(`${name}.json`, '{name}.json')}"\n}`}
              </pre>
              <PmCommand command={(pm) => `${DLX[pm]} shadcn@latest add @${SITE.namespace}/${name}`} />
            </div>
          </details>
        </div>
      ) : (
        <ol className="mt-6">
          {dependencies.length > 0 && (
            <Step n={++n} title="Install the packages it uses">
              <PmCommand command={(pm) => `${ADD[pm]} ${dependencies.join(' ')}`} />
            </Step>
          )}
          {usesCn && (
            <Step n={++n} title="Add the cn helper, if you don't have it yet">
              <PmCommand command={(pm) => `${ADD[pm]} clsx tailwind-merge`} />
              <CodeBlock lines={utils.lines} palette={palette} file={utils.file} />
            </Step>
          )}
          <Step n={++n} title="Copy the component into your project">
            {files.map((f) => (
              <CodeBlock key={f.file} lines={f.lines} palette={palette} file={`components/ui/${f.file}`} collapse={14} />
            ))}
          </Step>
          <Step n={++n} title="Match the import paths to your project" last />
        </ol>
      )}
    </div>
  );
}
