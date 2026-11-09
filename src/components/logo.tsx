/**
 * The mark: a lowercase "b" drawn as two plain strokes, a stem and a round bowl that leans into it.
 * No tile, no fill; it takes the colour of whatever it sits on (`currentColor`).
 * It draws itself in once (the stem, then the bowl) and tilts a few degrees when its link is hovered.
 * The draw-in is CSS (`.logo-draw` in globals.css), so it works without JavaScript and is skipped for reduced motion.
 * Put it inside an element with the `group` class to get the hover tilt.
 */
export function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-500 ease-[var(--ease-out)] group-hover:-rotate-[7deg] ${className}`}
    >
      <path className="logo-draw" pathLength={1} d="M9.5 4v20" />
      <path className="logo-draw" pathLength={1} style={{ '--d': '0.32s' } as React.CSSProperties} d="M9.5 19.1a4.9 4.9 0 1 0 9.8 0a4.9 4.9 0 1 0 -9.8 0" />
    </svg>
  );
}
