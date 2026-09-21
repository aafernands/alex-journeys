import Link from "next/link";
import { Pencil } from "lucide-react";

type Variant = "chip" | "on-photo";

type Props = {
  href: string;
  label: string;
  variant?: Variant;
};

const chipClass =
  "inline-flex items-center gap-1 rounded-full border border-border bg-white/95 px-2.5 py-1 font-sans text-[11px] font-semibold tracking-tight text-heading shadow-sm backdrop-blur-sm transition hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:border-border-strong dark:shadow-[0_6px_20px_rgba(0,0,0,0.45)]";

const onPhotoClass =
  "inline-flex items-center gap-1 rounded-full border border-hero-type/35 bg-black/45 px-2.5 py-1 font-sans text-[11px] font-semibold tracking-tight text-hero-type shadow-sm backdrop-blur-sm transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hero-type/70";

/**
 * Small pencil chip. Parent must already be admin-gated (AdminGate).
 */
export function AdminEditShortcut({
  href,
  label,
  variant = "chip",
}: Props) {
  return (
    <Link
      href={href}
      className={variant === "on-photo" ? onPhotoClass : chipClass}
      data-admin-edit={label}
    >
      <Pencil className="size-3 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      {label}
    </Link>
  );
}
