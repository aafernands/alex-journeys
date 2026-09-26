import { Gem } from "lucide-react";

/**
 * The solid orange diamond used for Premium across the site (header button,
 * drawer Subscribe). Locked prompts lead with it.
 */
export function PremiumDiamond({ size = "md" }: { size?: "sm" | "md" }) {
  const box = size === "sm" ? "size-8 rounded-lg" : "size-10 rounded-lg";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={`inline-flex ${box} shrink-0 items-center justify-center bg-accent text-on-solid`}
      aria-hidden="true"
    >
      <Gem className={icon} strokeWidth={2.25} />
    </span>
  );
}
