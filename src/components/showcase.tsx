'use client';

import { useState, type ReactNode } from 'react';
import type { CodeLine } from '@/lib/source';
import { CodeBlock } from './code-block';
import { Segmented } from './segmented';

const TABS = [
  { value: 'preview', label: 'Preview' },
  { value: 'code', label: 'Code' },
] as const;

/** The live demo, and its source one tab over. The demo stays mounted while you read the code. */
export function Showcase({
  note,
  demo,
  palette,
  children,
}: {
  note?: string;
  demo: { file: string; lines: CodeLine[] };
  palette: string[];
  children: ReactNode;
}) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const [readCode, setReadCode] = useState(false);

  return (
    <div>
      <div className="mb-3 flex items-end justify-between gap-4">
        <Segmented
          label="Show"
          value={tab}
          options={TABS}
          onChange={(t) => {
            setTab(t);
            if (t === 'code') setReadCode(true);
          }}
        />
        {note && (
          <p className={`max-w-[42ch] text-right text-[13.5px] leading-snug text-ink-3 transition-opacity duration-300 max-sm:hidden ${tab === 'preview' ? '' : 'opacity-0'}`}>
            <span className="font-medium text-ink-2">Try it:</span> {note}
          </p>
        )}
      </div>
      <div role="tabpanel" aria-label="Preview" hidden={tab !== 'preview'} className="rounded-[24px] border border-line bg-tile p-3 sm:p-5">
        {children}
      </div>
      {readCode && (
        <div role="tabpanel" aria-label="Code" hidden={tab !== 'code'}>
          <CodeBlock lines={demo.lines} palette={palette} file={demo.file} />
        </div>
      )}
    </div>
  );
}
