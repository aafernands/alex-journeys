import Link from "next/link";
import { redirect } from "next/navigation";
import { DestinationForm } from "@/components/cms/DestinationForm";
import { destinationsTree } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function CmsNewDestinationPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

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
        <p className="eyebrow mt-6 text-accent">Create</p>
        <h1 className="font-display mt-2 text-display text-heading">
          New destination
        </h1>
        <p className="mt-3 text-sm text-muted">
          Publishing upserts a country into{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            tree.json
          </code>{" "}
          and commits to GitHub.
        </p>
      </div>
      <DestinationForm mode="create" continents={continents} />
    </div>
  );
}
