import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DestinationForm } from "@/components/cms/DestinationForm";
import {
  destinationsTree,
  getDestinationBySlug,
} from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { sanitizeSlug } from "@/lib/cms/validate";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CmsEditDestinationPage({ params }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { slug: raw } = await params;
  const slug = sanitizeSlug(raw);
  if (!slug) notFound();

  const country = getDestinationBySlug(slug);
  if (!country) notFound();

  const continent =
    destinationsTree.find((c) =>
      c.countries.some((x) => x.slug === slug),
    ) ?? destinationsTree[0];

  const continents = destinationsTree.map((c) => ({
    id: c.id,
    name: c.name,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/cms/destinations"
          className="text-sm text-link transition hover:text-accent"
        >
          ← Destinations
        </Link>
        <p className="eyebrow mt-6 text-accent">Edit</p>
        <h1 className="font-display mt-2 text-display text-heading">
          {country.name}
        </h1>
        <p className="mt-3 text-sm text-muted">
          Updates the country in{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            tree.json
          </code>{" "}
          on GitHub (map + climate included).
        </p>
      </div>
      <DestinationForm
        mode="edit"
        continents={continents}
        initial={{
          country,
          continentId: continent?.id ?? "europe",
        }}
      />
    </div>
  );
}
