import { animate, type AnimationPlaybackControls } from 'motion/react';

let running: { controls: AnimationPlaybackControls; end: () => void } | null = null;

/**
 * Glides the page until `el` sits under the navbar, eased at both ends, whatever the reduced-motion setting (the site
 * chrome always moves). Scrolling, touching or a key press takes over. `onEnd` runs once it stops, either way.
 */
export function glideTo(el: Element, onEnd?: () => void) {
  running?.controls.stop();
  running?.end();

  const root = document.documentElement;
  const pad = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
  const from = window.scrollY;
  const to = Math.max(0, Math.min(el.getBoundingClientRect().top + from - pad, root.scrollHeight - window.innerHeight));

  const takeOver = ['wheel', 'touchstart', 'keydown'] as const;
  let ended = false;
  const end = () => {
    if (ended) return;
    ended = true;
    takeOver.forEach((t) => window.removeEventListener(t, interrupt));
    running = null;
    onEnd?.();
  };
  const interrupt = () => {
    controls.stop();
    end();
  };
  takeOver.forEach((t) => window.addEventListener(t, interrupt, { passive: true }));
  const controls = animate(from, to, {
    duration: Math.min(1.1, 0.5 + Math.abs(to - from) / 5000),
    ease: [0.65, 0, 0.35, 1],
    onUpdate: (y) => window.scrollTo({ top: y, behavior: 'instant' }),
    onComplete: end,
  });
  running = { controls, end };
}
