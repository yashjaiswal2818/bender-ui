'use client';

import { PmCommand } from './package-manager';

const DLX = { pnpm: 'pnpm dlx', npm: 'npx', yarn: 'yarn dlx', bun: 'bunx --bun' } as const;

/** `shadcn@latest add <target>` with the visitor's package manager in front. */
export function ShadcnAdd({ target }: { target: string }) {
  return <PmCommand command={(pm) => `${DLX[pm]} shadcn@latest add ${target}`} />;
}
