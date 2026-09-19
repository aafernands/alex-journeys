import type { ReactNode } from "react";
import Link from "next/link";
import { PostContent } from "@/components/blog/PostContent";

type Crumb = { href?: string; label: string };

type Props = {
  label?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  children?: ReactNode;
  /** Cleaned HTML body */
  html?: string;
  narrow?: boolean;
};

/** Shared light editorial page chrome (not the dark blog hero). */
export function SitePage({
  label,
  title,
  description,
  crumbs,
  children,
  html,
  narrow = true,
}: Props) {
  const width = narrow ? "max-w-3xl" : "max-w-6xl";

  return (
    <main className="bg-white pt-28 md:pt-32">
      <div className={`mx-auto ${width} px-5 py-10 md:px-8 md:py-14`}>
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
          <p className={`${crumbs ? "mt-8" : ""} text-label text-muted`}>
            {label}
          </p>
        ) : null}
        <h1
          className={`font-display text-display uppercase tracking-tight text-heading ${
            label || crumbs ? "mt-2" : ""
          }`}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-lead text-text">{description}</p>
        ) : null}

        {html ? (
          <div className="mt-10 md:mt-12">
            <PostContent html={html} />
          </div>
        ) : null}

        {children}
      </div>
    </main>
  );
}
