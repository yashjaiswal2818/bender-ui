// Built by scripts/build-registry.mjs (runs before dev and build).
import data from '@/generated/sources.json';

/** One highlighted line: `[text, colour, text, colour, …]`; colour indexes the palette, -1 is plain. */
export type CodeLine = (string | number)[];

export interface ApiProp {
  name: string;
  type: string;
  required: boolean;
  doc: string;
  default?: string;
}

export interface ApiType {
  name: string;
  doc: string;
  extends?: string;
  props?: ApiProp[];
  /** Set for `type X = …` aliases instead of props. */
  alias?: string;
}

export interface ComponentApi {
  component: string;
  propsType: string;
  types: ApiType[];
  hooks: { name: string; doc: string }[];
}

export interface ComponentSource {
  files: { file: string; lines: CodeLine[] }[];
  demo: { file: string; lines: CodeLine[] };
  usesCn: boolean;
  api: ComponentApi;
}

const sources = data.sources as unknown as Record<string, ComponentSource>;

/** Colours of the highlighted code (vitesse-light), indexed by `CodeLine`. */
export const CODE_PALETTE: string[] = data.palette;

/** shadcn/ui's `cn` helper, for the manual install. */
export const CN_UTILS = data.utils as unknown as { file: string; lines: CodeLine[] };

export const getSource = (name: string): ComponentSource | undefined => sources[name];
