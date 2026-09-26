import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { guideHubs } from "@/data/guides";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("guides", PAGE_DEFAULTS.guides);
  return {
    title: "Guides",
    description: page.description,
    alternates: { canonical: "/guides" },
  };
}

export default function GuidesPage() {
  const page = getPageWithFallback("guides", PAGE_DEFAULTS.guides);

  return (
    <SitePage
      cmsSlug="guides"
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Guides" },
      ]}
    >
      <ul className="hub-follow grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guideHubs.map((hub) => (
          <li key={hub.slug}>
            <Link
              href={`/guides/${hub.slug}`}
              className="panel-interactive group flex h-full gap-4 p-5"
            >
              <span className="icon-tile">
                <NavIcon name={hub.icon} size={20} />
              </span>
              <span>
                <span className="card-title block">
                  {hub.title}
                </span>
                <span className="card-body mt-1 block">
                  {hub.description}
                </span>
                <span className="card-cta mt-3 inline-block transition group-hover:text-accent">
                  Open hub →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
