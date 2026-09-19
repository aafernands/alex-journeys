import type { Metadata } from "next";
import { SitePage } from "@/components/pages/SitePage";
import { SearchPageClient } from "@/components/search/SearchPageClient";
import { getSearchIndex } from "@/lib/search-index";

export const metadata: Metadata = {
  title: "Search",
  description:
    "Search Stories, Guides, Places, and key pages across Fernandes Journeys.",
};

type Props = {
  searchParams: Promise<{ q?: string | string[] }>;
};

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const raw = params.q;
  const initialQuery = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const index = getSearchIndex();

  return (
    <SitePage
      label="Search"
      title="Search"
      description="Find stories, guide hubs, places, and pages across the journal."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Search" },
      ]}
    >
      <div className="mt-8 max-w-3xl">
        <SearchPageClient index={index} initialQuery={initialQuery} />
      </div>
    </SitePage>
  );
}
