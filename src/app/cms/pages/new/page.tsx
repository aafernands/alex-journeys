import Link from "next/link";
import { redirect } from "next/navigation";
import { PageForm } from "@/components/cms/PageForm";
import { isCmsAuthenticated } from "@/lib/cms/auth";

export const dynamic = "force-dynamic";

export default async function CmsNewPagePage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/cms/pages" className="text-sm text-link hover:text-accent">
          ← Pages
        </Link>
        <p className="eyebrow mt-6 text-accent">Create</p>
        <h1 className="font-display mt-2 text-display text-heading">New page</h1>
        <p className="mt-3 text-sm text-muted">
          Publishes{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            src/content/pages/&#123;slug&#125;.json
          </code>
          . Add a matching App Router page if the route does not exist yet.
        </p>
      </div>
      <PageForm mode="create" />
    </div>
  );
}
