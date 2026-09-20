import Link from "next/link";
import { redirect } from "next/navigation";
import { DesignForm } from "@/components/cms/DesignForm";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getSiteDesign } from "@/lib/site-design";

export const dynamic = "force-dynamic";

export default async function CmsDesignPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const design = getSiteDesign();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="eyebrow text-accent">Homepage &amp; brand</p>
        <h1 className="font-display mt-2 text-display text-heading">
          Website design
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          Control the homepage hero (image, location label, tagline, subtitle,
          CTAs) and major homepage section chrome (Start here, Places, Latest,
          Guides, Tools, OAuth note, Author intro). Saves commit{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            src/data/site-design.json
          </code>{" "}
          to GitHub; live after Vercel redeploys. Marketing pages like About and
          Contact are edited under{" "}
          <Link href="/cms/pages" className="text-link hover:text-accent">
            Pages
          </Link>
          .
        </p>
      </div>

      <DesignForm initial={design} />

      <p className="text-sm text-muted">
        Need a walkthrough? See{" "}
        <Link href="/cms/help" className="text-link hover:text-accent">
          Help
        </Link>{" "}
        or{" "}
        <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
          docs/CMS.md
        </code>
        .
      </p>
    </div>
  );
}
