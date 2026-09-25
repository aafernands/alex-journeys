import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

/**
 * Filter chip. The pill is 36px; the hit area extends to 44px.
 * Selected state uses ink, not the accent.
 */
export function Chip({ selected = false, className = "", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={`ui-chip${selected ? " is-selected" : ""} ${className}`.trim()}
      {...props}
    />
  );
}
