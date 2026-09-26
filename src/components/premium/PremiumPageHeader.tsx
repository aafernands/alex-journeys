import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { PremiumDiamond } from "@/components/premium/PremiumDiamond";

type Props = {
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
};

/** Top of the members pages (perks, downloads, deals). */
export function PremiumPageHeader({ id, eyebrow, title, lead, back, actions }: Props) {
  return (
    <header className="border-b border-border bg-surface-soft">
      <div className="section-shell pb-8 pt-6 md:pb-12 md:pt-10">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-muted transition hover:text-heading"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        <div className={`flex items-center gap-3 ${back ? "mt-2" : ""}`}>
          <PremiumDiamond />
          <p className="eyebrow">{eyebrow}</p>
        </div>
        <h1 id={id} className="font-display text-display mt-3 max-w-3xl text-balance text-heading">
          {title}
        </h1>
        {lead ? (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-text md:text-lg">{lead}</p>
        ) : null}
        {actions ? <div className="mt-6 flex flex-col gap-3 sm:flex-row">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Friendly empty state for members when nothing is posted yet. */
export function PremiumComingSoon({ title = "First ones coming soon", body }: { title?: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 px-6 py-10 text-center">
      <span className="mx-auto flex w-fit">
        <PremiumDiamond />
      </span>
      <p className="font-display mt-4 text-xl font-bold text-heading">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text">{body}</p>
    </div>
  );
}
