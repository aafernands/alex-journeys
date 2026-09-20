import Link from "next/link";
import { redirect } from "next/navigation";
import { destinationsTree } from "@/data/destinations";
import { isCmsAuthenticated } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function CmsDestinationsPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/cms"
            className="text-sm text-link transition hover:text-accent"
          >
            ← Dashboard
          </Link>
          <p className="eyebrow mt-6 text-accent">Destinations</p>
          <h1 className="font-display mt-2 text-display text-heading">
            Countries & continents
          </h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Edits commit{" "}
            <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
              src/content/destinations/tree.json
            </code>{" "}
            on GitHub. Map pins and climate months are included.
          </p>
        </div>
        <Link href="/cms/destinations/new" className="btn btn-primary">
          New destination
        </Link>
      </div>

      {destinationsTree.map((continent) => (
        <section key={continent.id} className="panel overflow-hidden">
          <div className="border-b border-border bg-surface-soft px-5 py-3">
            <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
              {continent.name}{" "}
              <span className="font-mono text-xs font-normal normal-case text-muted">
                ({continent.id})
              </span>
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {continent.countries.map((country) => (
              <li
                key={country.slug}
                className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-heading">{country.name}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {country.region}
                    {country.tripLabel ? ` · ${country.tripLabel}` : ""} ·{" "}
                    <span className="font-mono">{country.slug}</span>
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Link
                    href={`/${country.slug}`}
                    className="btn btn-secondary text-xs"
                  >
                    View
                  </Link>
                  <Link
                    href={`/cms/destinations/edit/${country.slug}`}
                    className="btn btn-secondary text-xs"
                  >
                    Edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
