'use client';

import { Fragment, useState } from 'react';
import type { CodeLine } from '@/lib/source';
import { codeText } from '@/lib/prompt';
import { CopyButton } from './copy-button';

/** Highlighted source with line numbers and a copy button. `collapse` shows that many lines until it's opened. */
export function CodeBlock({
  lines,
  palette,
  file,
  collapse,
  className = '',
}: {
  lines: CodeLine[];
  palette: string[];
  file: string;
  collapse?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(!collapse || lines.length <= collapse + 6);
  const shown = open ? lines : lines.slice(0, collapse);

  return (
    <div className={`overflow-clip rounded-[18px] border border-line bg-surface ${className}`}>
      <div className="flex items-center gap-3 border-b border-line py-1.5 pl-4 pr-1.5">
        <span className="min-w-0 truncate font-mono text-[12.5px] text-ink-2">{file}</span>
        <span className="tabular ml-auto shrink-0 text-[12px] text-ink-3">{lines.length} lines</span>
        <CopyButton text={() => codeText(lines)} />
      </div>
      <pre className={`overflow-auto py-3 font-mono text-[12.5px] leading-[1.7] text-[#393a34] ${open ? 'max-h-[560px]' : ''}`}>
        <code className="grid grid-cols-[auto_1fr]">
          {shown.map((line, i) => (
            <Fragment key={i}>
              <span className="tabular select-none pl-4 pr-5 text-right text-ink-3/50">{i + 1}</span>
              <span className="whitespace-pre pr-6">
                {line.map((part, j) =>
                  j % 2 === 0 ? (
                    <span key={j} style={line[j + 1] === -1 ? undefined : { color: palette[line[j + 1] as number] }}>
                      {part}
                    </span>
                  ) : null,
                )}
                {line.length === 0 && ' '}
              </span>
            </Fragment>
          ))}
        </code>
      </pre>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full border-t border-line py-2.5 text-[13px] font-medium text-ink-2 transition-colors hover:bg-tile hover:text-ink"
        >
          Show all {lines.length} lines
        </button>
      )}
    </div>
  );
}
