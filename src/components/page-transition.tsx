import { ViewTransition, type ReactNode } from 'react';

const PAGE_ENTER = {
  'nav-forward': 'nav-forward',
  'nav-back': 'nav-back',
  'nav-down': 'nav-down',
  'nav-up': 'nav-up',
  'nav-fade': 'nav-fade',
  default: 'nav-fade',
} as const;

const PAGE_EXIT = {
  'nav-forward': 'nav-forward',
  'nav-back': 'nav-back',
  'nav-down': 'nav-down',
  'nav-up': 'nav-up',
  'nav-fade': 'nav-fade',
  default: 'nav-fade',
} as const;

/**
 * Wraps route page content in React's native ViewTransition with directional and
 * crossfade presets driven by `<Link transitionTypes={[...]} />`.
 */
export function PageTransition({
  transitionKey,
  children,
}: {
  transitionKey?: string;
  children: ReactNode;
}) {
  return (
    <ViewTransition key={transitionKey} enter={PAGE_ENTER} exit={PAGE_EXIT} default="none">
      {children}
    </ViewTransition>
  );
}
