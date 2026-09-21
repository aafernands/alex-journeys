import Link from "next/link";
import { MessageSquare, Pencil, Shield } from "lucide-react";
import type { AdminEditLink } from "@/lib/admin-edit";
import { CMS_COMMENTS_HREF, CMS_HOME_HREF } from "@/lib/admin-edit";

type Props = {
  editHref: string;
  editLabel: string;
  extraLinks?: AdminEditLink[];
};

const itemClass =
  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold tracking-tight text-heading transition hover:bg-surface-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Compact public-site admin bar. Parent must already be admin-gated.
 */
export function AdminBar({ editHref, editLabel, extraLinks }: Props) {
  return (
    <nav
      className="admin-bar"
      aria-label="CMS admin shortcuts"
      data-admin-bar=""
    >
      <div className="flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center gap-0.5 rounded-full border border-border bg-white/95 p-1 shadow-[0_8px_30px_rgba(20,17,13,0.16)] backdrop-blur-md dark:border-border-strong dark:shadow-[0_10px_32px_rgba(0,0,0,0.55)]">
        <Link href={CMS_HOME_HREF} className={itemClass}>
          <Shield
            className="size-3.5 shrink-0 text-accent"
            strokeWidth={2}
            aria-hidden="true"
          />
          CMS
        </Link>
        <Link
          href={editHref}
          className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold tracking-tight text-on-solid transition hover:bg-accent-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
          {editLabel}
        </Link>
        <Link href={CMS_COMMENTS_HREF} className={itemClass}>
          <MessageSquare
            className="size-3.5 shrink-0 text-accent"
            strokeWidth={2}
            aria-hidden="true"
          />
          Comments
        </Link>
        {extraLinks?.map((link) => (
          <Link key={link.href} href={link.href} className={itemClass}>
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
