// One lazy loader per component demo, written by scripts/build-registry.mjs.
// Only the page that shows a demo should call its loader, so a page never pays for the other demos.
export { DEMOS } from '@/generated/demos';
export type { DemoLoader } from '@/generated/demos';
