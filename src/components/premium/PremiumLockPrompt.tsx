import Link from "next/link";
import type { ReactNode } from "react";
import { PremiumDiamond } from "@/components/premium/PremiumDiamond";

type Props = {
  /** One short line, e.g. "You’ve saved 5 trips. Premium members get unlimited trips." */
  message: string;
  detail?: ReactNode;
  ctaLabel?: string;
  href?: string;
  /** Extra action next to the primary button (for example Sign in). */
  secondary?: ReactNode;
  className?: string;
  onNavigate?: () => void;
};

/**
 * Inline Premium prompt for a feature that stopped at the free limit or is
 * members-only. Orange diamond, one line, one primary button (full width on
 * phones).
 */
export function PremiumLockPrompt({
  message,
  detail,
  ctaLabel = "See Premium",
  href = "/premium",
  secondary,
  className = "",
  onNavigate,
}: Props) {
  return (
    <aside
      className={`premium-lock-prompt rounded-[var(--radius-card)] border border-accent/30 bg-accent/5 p-4 sm:p-5 ${className}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <PremiumDiamond size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[0.9375rem] font-semibold leading-snug text-heading">{message}</p>
          {detail ? <p className="mt-1 text-sm leading-relaxed text-text">{detail}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Link href={href} className="btn btn-primary w-full sm:w-auto" onClick={onNavigate}>
          {ctaLabel}
        </Link>
        {secondary}
      </div>
    </aside>
  );
}
