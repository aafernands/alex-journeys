import Link from "next/link";
import { redirect } from "next/navigation";
import { PagesList } from "@/components/cms/PagesList";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { CODE_ONLY_PAGE_ROUTES, getAllCmsPages } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function CmsPagesPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const pages = getAllCmsPages().map((p) => ({
    slug: p.slug,
    title: p.title,
    description: p.description,
    label: p.label,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">Content pages</p>
          <h1 className="font-display mt-2 text-display text-heading">Pages</h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            JSON-backed marketing pages under{" "}
            <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
              src/content/pages
            </code>
            . Hub routes built only in React are listed below as code-only.
          </p>
        </div>
        <Link href="/cms/pages/new" className="btn btn-primary">
          New page
        </Link>
      </div>

      <PagesList pages={pages} />

      <section className="panel p-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Code-only routes (not editable here)
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {CODE_ONLY_PAGE_ROUTES.map((r) => (
            <li key={r.path} className="text-sm text-muted">
              <span className="font-mono text-heading">{r.path}</span> — {r.note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
