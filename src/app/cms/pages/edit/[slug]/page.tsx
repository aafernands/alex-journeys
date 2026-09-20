import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PageForm } from "@/components/cms/PageForm";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { sanitizeSlug } from "@/lib/cms/validate";
import { getPageBySlug } from "@/lib/pages";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CmsEditPagePage({ params }: PageProps) {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const { slug: raw } = await params;
  const slug = sanitizeSlug(raw);
  if (!slug) notFound();

  const page = getPageBySlug(slug);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/cms/pages" className="text-sm text-link hover:text-accent">
          ← Pages
        </Link>
        <p className="eyebrow mt-6 text-accent">Edit page</p>
        <h1 className="font-display mt-2 text-display text-heading">
          {page.title}
        </h1>
      </div>
      <PageForm
        mode="edit"
        initial={{
          title: page.title,
          slug: page.slug,
          description: page.description,
          label: page.label ?? "",
          contentHtml: page.contentHtml,
        }}
      />
    </div>
  );
}
