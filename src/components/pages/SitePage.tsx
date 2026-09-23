import type { ReactNode } from "react";
import Link from "next/link";
import {
  AdminPublicChrome,
  AdminSectionEdit,
} from "@/components/admin/AdminPublicChrome";
import { PostContent } from "@/components/blog/PostContent";
import {
  cmsEditPageHref,
  type AdminEditLink,
} from "@/lib/admin-edit";

type Crumb = { href?: string; label: string };

type Props = {
  label?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
  /** Cleaned HTML body */
  html?: string;
  /** Canonical path for Pinterest pins on content images. */
  path?: string;
  narrow?: boolean;
  tone?: "default" | "white";
  /** CMS page slug → `/cms/pages/edit/{slug}` for allowlisted admins. */
  cmsSlug?: string;
  /** Override default page-edit target (e.g. guide hubs). */
  adminEdit?: AdminEditLink;
  extraAdminLinks?: AdminEditLink[];
  /** Tighter mobile header for an in-flow tool. Desktop keeps the full intro. */
  compact?: boolean;
  /** Plan a Trip is the page. Hide site newsletter chrome that would sit in the steps. */
  planFlow?: boolean;
  /** Keep the shared shell/admin chrome but let a page render its own hero/header. */
  hideHeader?: boolean;
};

/** Shared product page chrome — same section shell + type system as homepage. */
export function SitePage({
  label,
  title,
  description,
  crumbs,
  children,
  html,
  path,
  narrow = true,
  tone = "white",
  cmsSlug,
  adminEdit,
  extraAdminLinks,
  compact = false,
  planFlow = false,
  hideHeader = false,
}: Props) {
  const width = narrow ? "max-w-3xl" : "max-w-none";
  const bg =
    tone === "white"
      ? "bg-white [--carousel-fade:var(--white)]"
      : "bg-bg [--carousel-fade:var(--bg)]";
  const editHref = adminEdit?.href ?? (cmsSlug ? cmsEditPageHref(cmsSlug) : null);
  const editLabel = adminEdit?.label ?? "Edit page";

  return (
    <main
      className={[bg, compact ? "plan-page" : "", planFlow ? "plan-flow" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {editHref ? (
        <AdminPublicChrome
          editHref={editHref}
          editLabel={editLabel}
          extraLinks={extraAdminLinks}
          showChip={false}
        />
      ) : null}
      <div className="section-shell section-band">
        <div className={width}>
          {!hideHeader ? (
            <div className={compact ? "plan-page-chrome" : undefined}>
              {crumbs && crumbs.length > 0 ? (
                <nav aria-label="Breadcrumb" className="text-sm text-muted">
                  <ol className="flex flex-wrap items-center gap-2">
                    {crumbs.map((c, i) => (
                      <li key={`${c.label}-${i}`} className="flex items-center gap-2">
                        {i > 0 ? <span aria-hidden="true">›</span> : null}
                        {c.href ? (
                          <Link
                            href={c.href}
                            className="text-link transition hover:text-accent"
                          >
                            {c.label}
                          </Link>
                        ) : (
                          <span className="text-text">{c.label}</span>
                        )}
                      </li>
                    ))}
                  </ol>
                </nav>
              ) : null}

              {label ? (
                <p className={`${crumbs ? "mt-8" : ""} eyebrow ${compact ? "max-sm:hidden" : ""}`}>
                  {label}
                </p>
              ) : null}
              <div
                className={`flex flex-wrap items-start justify-between gap-3 ${
                  label || crumbs ? "mt-2" : ""
                }`}
              >
                <h1 className="font-display text-display text-heading">{title}</h1>
                {editHref ? (
                  <AdminSectionEdit href={editHref} label={editLabel} />
                ) : null}
              </div>
              {description ? (
                <p className={`mt-4 max-w-2xl text-lead text-text ${compact ? "max-sm:hidden" : ""}`}>
                  {description}
                </p>
              ) : null}
            </div>
          ) : null}

          {html ? (
            <div className="mt-10 md:mt-12">
              <PostContent
                html={html}
                pagePath={path}
                shareDescription={title}
              />
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </main>
  );
}
