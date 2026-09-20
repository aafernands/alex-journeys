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
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Guides" },
      ]}
    >
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guideHubs.map((hub) => (
          <li key={hub.slug}>
            <Link
              href={`/guides/${hub.slug}`}
              className="panel-interactive group flex h-full gap-4 p-5"
            >
              <span className="panel-nested flex size-11 shrink-0 items-center justify-center bg-white text-accent">
                <NavIcon name={hub.icon} size={20} />
              </span>
              <span>
                <span className="font-display block text-lg font-bold text-heading">
                  {hub.title}
                </span>
                <span className="mt-1 block text-sm leading-relaxed text-text">
                  {hub.description}
                </span>
                <span className="mt-3 inline-block text-sm font-semibold text-link transition group-hover:text-accent">
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
