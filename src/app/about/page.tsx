import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PostContent } from "@/components/blog/PostContent";
import { SitePage } from "@/components/pages/SitePage";
import { site } from "@/data/content";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("about", PAGE_DEFAULTS.about);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/about" },
  };
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asString(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

export default function AboutPage() {
  const page = getPageWithFallback("about", PAGE_DEFAULTS.about);
  const next = asRecord(page.sections?.nextStep);
  const primary = asRecord(next.primaryCta);
  const secondary = asRecord(next.secondaryCta);
  const tertiary = asRecord(next.tertiaryCta);

  return (
    <SitePage
      cmsSlug="about"
      label={page.label}
      title={page.title}
      description={page.description}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "About" },
      ]}
    >
      <div className="hub-follow grid gap-8 md:grid-cols-[minmax(0,14rem)_1fr] md:items-start md:gap-10">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[14rem] overflow-hidden rounded-xl border border-border bg-surface-soft md:mx-0">
          <Image
            src={site.authorPhoto}
            alt={site.authorName}
            fill
            sizes="(max-width: 768px) 224px, 224px"
            className="object-cover object-top"
            priority
          />
        </div>
        <div className="panel p-6 md:p-8">
          <PostContent html={page.contentHtml} />
        </div>
      </div>

      <aside className="panel-soft hub-block p-6 md:p-8">
        <p className="eyebrow">{asString(next.eyebrow, "Next step")}</p>
        <p className="card-title mt-2">
          {asString(next.title, "New to the journal?")}
        </p>
        <p className="card-body mt-2">
          {asString(
            next.body,
            "Start with destinations I’ve visited, then stories from the road, then the resources and trip tools I actually use.",
          )}
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={asString(primary.href, "/start-here")}
            className="btn btn-primary btn-block sm:w-auto"
          >
            {asString(primary.label, "Start here")}
          </Link>
          <Link
            href={asString(secondary.href, "/media-kit")}
            className="btn btn-secondary btn-block sm:w-auto"
          >
            {asString(secondary.label, "Media kit")}
          </Link>
          <Link
            href={asString(tertiary.href, "/contact")}
            className="btn btn-secondary btn-block sm:w-auto"
          >
            {asString(tertiary.label, "Contact")}
          </Link>
        </div>
      </aside>

      <p className="mt-10 text-sm text-muted">
        Prefer email?{" "}
        <a href={`mailto:${site.email}`} className="text-link hover:text-accent">
          {site.email}
        </a>
      </p>
    </SitePage>
  );
}
