import type { CSSProperties } from "react";

type Props = {
  className?: string;
  style?: CSSProperties;
};

/**
 * Warm placeholder block for content that is still loading. Size it with
 * utility classes (height, width, aspect ratio, radius). It is decorative:
 * wrap a group of skeletons in an element with role="status" and a short
 * text label (for example "Finding rooms…") so screen readers hear one line.
 * The pulse turns off under prefers-reduced-motion.
 */
export function Skeleton({ className = "", style }: Props) {
  return <span aria-hidden="true" className={`ui-skeleton ${className}`.trim()} style={style} />;
}
