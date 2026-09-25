import type { HTMLAttributes, ReactNode } from "react";

type Props = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Overrides the parent density for this card’s padding. */
  density?: "compact" | "comfortable";
};

/** Flat card. No shadow. Compact padding is 12px, comfortable is 16px. */
export function Card({ children, density, className = "", ...props }: Props) {
  return (
    <div
      className={`ui-card${density ? ` ui-card-${density}` : ""} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
