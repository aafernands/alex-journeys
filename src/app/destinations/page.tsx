import type { Metadata } from "next";
import { DestinationCarousel } from "@/components/destinations/DestinationCarousel";
import { SitePage } from "@/components/pages/SitePage";
import {
  destinationsTree,
  getAllDestinations,
} from "@/data/destinations";
import { CMS_DESTINATIONS_HREF } from "@/lib/admin-edit";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("destinations", PAGE_DEFAULTS.destinations);
  return {
    title: "Places",
    description: page.description,
    alternates: { canonical: "/destinations" },
  };
}

export default function DestinationsIndexPage() {
  const page = getPageWithFallback("destinations", PAGE_DEFAULTS.destinations);
  const all = getAllDestinations();

  return (
    <SitePage
      cmsSlug="destinations"
      extraAdminLinks={[
        { href: CMS_DESTINATIONS_HREF, label: "Places CMS" },
      ]}
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Places" },
      ]}
    >
      <DestinationCarousel
        className="hub-follow"
        destinations={all}
        label="All places"
        preloadFirst
      />

      <nav aria-label="Continents" className="mt-8 flex flex-wrap gap-2">
        {destinationsTree.map((continent) => (
          <a
            key={continent.id}
            href={`#${continent.id}`}
            className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-semibold text-heading transition hover:border-border-strong hover:bg-surface-soft"
          >
            {continent.name}
            <span className="ml-1.5 text-muted">
              {continent.countries.length}
            </span>
          </a>
        ))}
      </nav>

      <div className="hub-block space-y-12 md:space-y-16">
        {destinationsTree.map((continent) => (
          <section
            key={continent.id}
            id={continent.id}
            aria-labelledby={`continent-${continent.id}`}
            className="scroll-mt-28"
          >
            <div className="relative mb-6 flex items-end justify-between gap-4 border-b border-border pb-4">
              <div>
                <p className="eyebrow">
                  {continent.countries.length}{" "}
                  {continent.countries.length === 1 ? "place" : "places"}
                </p>
                <h2
                  id={`continent-${continent.id}`}
                  className="font-display mt-1 text-title text-heading"
                >
                  {continent.name}
                </h2>
              </div>
              <span
                aria-hidden="true"
                className="hidden select-none font-display text-5xl font-bold leading-none text-heading/[0.07] sm:block"
              >
                {continent.name.slice(0, 2)}
              </span>
            </div>

            <DestinationCarousel
              destinations={continent.countries}
              labelledBy={`continent-${continent.id}`}
            />
          </section>
        ))}
      </div>
    </SitePage>
  );
}
