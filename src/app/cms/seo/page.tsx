import Link from "next/link";
import { redirect } from "next/navigation";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { getSeoLinkCatalog } from "@/lib/seo-catalog";
import { auditPostSeo, seoScoreBand } from "@/lib/seo-audit";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

export const dynamic = "force-dynamic";

function scoreClass(score: number): string {
  const band = seoScoreBand(score);
  if (band === "good") return "bg-steel/15 text-steel";
  if (band === "fair") return "bg-accent/15 text-accent-deep";
  return "bg-red-600/10 text-red-700 dark:text-red-300";
}

export default async function CmsSeoDashboardPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  const posts = getAllPosts();
  const catalog = getSeoLinkCatalog();
  const rows = posts
    .map((meta) => {
      const post = getPostBySlug(meta.slug);
      const audit = auditPostSeo(
        {
          slug: meta.slug,
          title: post?.title ?? meta.title,
          excerpt: post?.excerpt ?? meta.excerpt,
          seoTitle: post?.seoTitle,
          seoDescription: post?.seoDescription,
          focusKeyword: post?.focusKeyword,
          contentHtml: post?.contentHtml ?? "",
          featuredImage: post?.featuredImage ?? meta.featuredImage,
          itinerary: post?.itinerary,
        },
        { catalog },
      );
      return {
        slug: meta.slug,
        title: post?.title ?? meta.title,
        score: audit.score,
        issues: audit.issues,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      if (b.issues.length !== a.issues.length) return b.issues.length - a.issues.length;
      return a.title.localeCompare(b.title);
    });

  const average =
    rows.length === 0
      ? 0
      : Math.round(rows.reduce((sum, row) => sum + row.score, 0) / rows.length);
  const poor = rows.filter((row) => seoScoreBand(row.score) === "poor").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">Search</p>
          <h1 className="font-display mt-2 text-display text-heading">SEO</h1>
          <p className="mt-3 max-w-xl text-sm text-muted">
            Every published story, scored from the same checklist as the post
            editor. Worst scores are first. Warnings do not block publishing.
          </p>
        </div>
        <Link href="/cms/posts" className="btn btn-secondary">
          All posts
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Posts
          </p>
          <p className="font-display mt-2 text-3xl font-bold text-heading">
            {rows.length}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Average score
          </p>
          <p className="font-display mt-2 text-3xl font-bold text-heading">
            {average}
          </p>
        </div>
        <div className="panel p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Below 50
          </p>
          <p className="font-display mt-2 text-3xl font-bold text-heading">
            {poor}
          </p>
        </div>
      </section>

      {rows.length === 0 ? (
        <p className="panel px-5 py-8 text-sm text-muted">No published posts yet.</p>
      ) : (
        <ol className="panel divide-y divide-border overflow-hidden">
          {rows.map((row, index) => (
            <li
              key={row.slug}
              className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span
                  className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold ${scoreClass(row.score)}`}
                >
                  {row.score}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    {index + 1}
                  </p>
                  <Link
                    href={`/cms/edit/${row.slug}`}
                    className="font-semibold text-heading hover:text-accent"
                  >
                    {row.title}
                  </Link>
                  <p className="mt-0.5 font-mono text-xs text-muted">/{row.slug}</p>
                  {row.issues.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-sm text-text">
                      {row.issues.slice(0, 3).map((issue) => (
                        <li key={issue}>{issue}</li>
                      ))}
                      {row.issues.length > 3 ? (
                        <li className="text-xs text-muted">
                          +{row.issues.length - 3} more
                        </li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-muted">No issues flagged.</p>
                  )}
                </div>
              </div>
              <Link
                href={`/cms/edit/${row.slug}`}
                className="btn btn-secondary shrink-0 text-xs"
              >
                Edit
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
