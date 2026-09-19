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
  tone?: "default" | "white";
};

/** Shared product page chrome — same section shell + type system as homepage. */
export function SitePage({
  label,
  title,
  description,
  crumbs,
  children,
  html,
  narrow = true,
  tone = "white",
}: Props) {
  const width = narrow ? "max-w-3xl" : "max-w-none";
  const bg = tone === "white" ? "bg-white" : "bg-bg";

  return (
    <main className={bg}>
      <div className="section-shell py-10 md:py-14">
        <div className={width}>
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
            <p className={`${crumbs ? "mt-8" : ""} eyebrow`}>{label}</p>
          ) : null}
          <h1
            className={`font-display text-display text-heading ${
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
      </div>
    </main>
  );
}
