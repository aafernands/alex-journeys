"use client";

import { useMemo } from "react";
import {
  FOCUS_KEYWORD_MAX,
  SEO_DESCRIPTION_MAX,
  SEO_DESCRIPTION_TARGET,
  SEO_TITLE_MAX,
  SEO_TITLE_TARGET,
} from "@/lib/post-seo";
import {
  auditPostSeo,
  seoScoreBand,
  type SeoAuditItinerary,
  type SeoCheckStatus,
  type SeoLinkCatalog,
} from "@/lib/seo-audit";
import { getSiteUrl } from "@/lib/site-url";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

type Props = {
  title: string;
  excerpt: string;
  slug: string;
  seoTitle: string;
  seoDescription: string;
  focusKeyword: string;
  noindex: boolean;
  contentHtml: string;
  featuredImageUrl: string;
  featuredImageAlt: string;
  itinerary?: SeoAuditItinerary | null;
  linkCatalog: SeoLinkCatalog;
  onSeoTitle: (value: string) => void;
  onSeoDescription: (value: string) => void;
  onFocusKeyword: (value: string) => void;
  onNoindex: (value: boolean) => void;
  onDirty: () => void;
};

function counterTone(length: number, target: number, missing: boolean): string {
  if (missing) return "text-red-700 dark:text-red-300";
  if (length > target) return "text-accent";
  return "text-steel";
}

function statusDot(status: SeoCheckStatus): string {
  if (status === "pass") return "bg-steel";
  if (status === "warn") return "bg-accent";
  return "bg-red-600";
}

function scoreTone(score: number): string {
  const band = seoScoreBand(score);
  if (band === "good") return "bg-steel/15 text-steel";
  if (band === "fair") return "bg-accent/15 text-accent-deep";
  return "bg-red-600/10 text-red-700 dark:text-red-300";
}

function previewHost(): string {
  try {
    return new URL(getSiteUrl()).host;
  } catch {
    return "www.alexjourneys.com";
  }
}

export function SeoPanel({
  title,
  excerpt,
  slug,
  seoTitle,
  seoDescription,
  focusKeyword,
  noindex,
  contentHtml,
  featuredImageUrl,
  featuredImageAlt,
  itinerary,
  linkCatalog,
  onSeoTitle,
  onSeoDescription,
  onFocusKeyword,
  onNoindex,
  onDirty,
}: Props) {
  const effectiveTitle = seoTitle.trim() || title.trim();
  const effectiveDescription = seoDescription.trim() || excerpt.trim();
  const audit = useMemo(
    () =>
      auditPostSeo(
        {
          slug,
          title,
          excerpt,
          seoTitle,
          seoDescription,
          focusKeyword,
          contentHtml,
          featuredImage: featuredImageUrl
            ? { url: featuredImageUrl, alt: featuredImageAlt }
            : null,
          itinerary,
        },
        { catalog: linkCatalog },
      ),
    [
      contentHtml,
      excerpt,
      featuredImageAlt,
      featuredImageUrl,
      focusKeyword,
      itinerary,
      linkCatalog,
      seoDescription,
      seoTitle,
      slug,
      title,
    ],
  );

  const attention = audit.checks.filter((check) => check.status !== "pass").length;
  const host = previewHost();
  const slugLabel = slug.trim() || "post-slug";

  return (
    <section
      id="cms-seo-panel"
      className="space-y-5 rounded-xl border border-border bg-surface-soft p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-bold text-heading">SEO</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Search title and description fall back to the post title and excerpt
            when these fields are empty. The checklist is a warning only — it
            does not block publishing.
          </p>
        </div>
        <div
          className={`grid h-16 w-16 shrink-0 place-items-center rounded-full font-display text-xl font-bold ${scoreTone(audit.score)}`}
          aria-label={`SEO score ${audit.score} out of 100`}
        >
          {audit.score}
        </div>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="cms-seo-title" className="text-sm font-semibold text-heading">
            SEO title
          </label>
          <span
            className={`text-xs font-semibold tabular-nums ${counterTone(
              effectiveTitle.length,
              SEO_TITLE_TARGET,
              effectiveTitle.length === 0,
            )}`}
          >
            {effectiveTitle.length}/{SEO_TITLE_TARGET}
            {effectiveTitle.length > SEO_TITLE_TARGET ? " · long" : ""}
          </span>
        </div>
        <input
          id="cms-seo-title"
          value={seoTitle}
          onChange={(event) => {
            onSeoTitle(event.target.value);
            onDirty();
          }}
          maxLength={SEO_TITLE_MAX}
          placeholder={title.trim() || "Falls back to the post title"}
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-muted">
          {seoTitle.trim()
            ? "Used as the search and social title."
            : title.trim()
              ? `Empty — falls back to the post title (${title.trim().length} characters).`
              : "Empty — add a post title or an SEO title."}
        </p>
      </div>

      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label
            htmlFor="cms-seo-description"
            className="text-sm font-semibold text-heading"
          >
            Meta description
          </label>
          <span
            className={`text-xs font-semibold tabular-nums ${counterTone(
              effectiveDescription.length,
              SEO_DESCRIPTION_TARGET,
              effectiveDescription.length === 0,
            )}`}
          >
            {effectiveDescription.length}/{SEO_DESCRIPTION_TARGET}
            {effectiveDescription.length > SEO_DESCRIPTION_TARGET ? " · long" : ""}
          </span>
        </div>
        <textarea
          id="cms-seo-description"
          value={seoDescription}
          onChange={(event) => {
            onSeoDescription(event.target.value);
            onDirty();
          }}
          rows={3}
          maxLength={SEO_DESCRIPTION_MAX}
          placeholder={excerpt.trim() || "Falls back to the excerpt"}
          className={areaClass}
        />
        <p className="mt-1 text-xs text-muted">
          {seoDescription.trim()
            ? "Used as the search and social description."
            : excerpt.trim()
              ? `Empty — falls back to the excerpt (${excerpt.trim().length} characters).`
              : "Empty — add an excerpt or a meta description."}
        </p>
      </div>

      <div>
        <label htmlFor="cms-seo-keyword" className="text-sm font-semibold text-heading">
          Focus keyword <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="cms-seo-keyword"
          value={focusKeyword}
          onChange={(event) => {
            onFocusKeyword(event.target.value);
            onDirty();
          }}
          maxLength={FOCUS_KEYWORD_MAX}
          placeholder="e.g. Maroon Bells sunrise"
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-muted">
          Only used by this checklist. It is not printed on the public page.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-white px-4 py-3">
        <label htmlFor="cms-seo-noindex" className="flex items-start gap-3">
          <input
            id="cms-seo-noindex"
            type="checkbox"
            checked={noindex}
            onChange={(event) => {
              onNoindex(event.target.checked);
              onDirty();
            }}
            className="mt-0.5 h-4 w-4 rounded border-border accent-[var(--accent)]"
          />
          <span>
            <span className="text-sm font-semibold text-heading">
              Hide from Google (noindex)
            </span>
            <span className="mt-1 block text-xs leading-relaxed text-muted">
              Adds a noindex robots tag on this post and leaves it out of
              sitemap.xml. The page stays on the site.
            </span>
          </span>
        </label>
      </div>

      <div id="cms-seo-preview">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">
          Search preview
        </p>
        <div className="mt-2 rounded-lg border border-border bg-white p-4 text-left">
          <div className="flex items-center gap-3">
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f1f3f4] font-display text-xs font-bold text-[#202124]"
              aria-hidden
            >
              A
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm text-[#202124]">Alex Journeys</p>
              <p className="truncate text-xs text-[#4d5156]">
                {host}
                <span aria-hidden> › </span>
                {slugLabel}
              </p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 font-sans text-xl leading-snug text-[#1a0dab]">
            {effectiveTitle || "Post title"}
          </p>
          <p className="mt-1 line-clamp-3 text-sm leading-snug text-[#4d5156]">
            {effectiveDescription || "Meta description preview."}
          </p>
          {noindex ? (
            <p className="mt-2 text-xs font-semibold text-accent-deep">
              Hidden from Google — this URL is noindex and omitted from the sitemap.
            </p>
          ) : null}
        </div>
      </div>

      <div id="cms-seo-checklist">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-heading">Checklist</h3>
          <p className="text-xs text-muted">
            {attention === 0
              ? "All clear"
              : `${attention} item${attention === 1 ? "" : "s"} to review`}
          </p>
        </div>
        <ul className="mt-3 space-y-2">
          {audit.checks.map((check) => (
            <li key={check.id} className="flex items-start gap-2.5">
              <span
                className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${statusDot(check.status)}`}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-heading">
                  <span className="sr-only">
                    {check.status === "pass"
                      ? "Pass"
                      : check.status === "warn"
                        ? "Warning"
                        : "Needs work"}
                    :{" "}
                  </span>
                  {check.label}
                </p>
                <p className="text-xs leading-relaxed text-muted">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
