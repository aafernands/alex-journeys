import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/blog/PostContent";
import { PostItineraryTimeline } from "@/components/blog/PostItineraryTimeline";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { SavePostButton } from "@/components/SavePostButton";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { JsonLd } from "@/components/JsonLd";
import {
  formatPostDate,
  getPostBySlug,
  getRelatedPosts,
} from "@/lib/posts";
import { publicPostPath } from "@/lib/public-paths";
import { blogPostingJsonLd } from "@/lib/seo";
import { site } from "@/data/content";

/** Pull simple TOC from h2 text in HTML when present */
function extractToc(html: string): { id: string; label: string }[] {
  const headings: { id: string; label: string }[] = [];
  const re = /<h2[^>]*>(.*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const label = m[1].replace(/<[^>]+>/g, "").trim();
    if (!label) continue;
    const id = label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    headings.push({ id, label });
  }
  return headings.slice(0, 8);
}

type BlogPostViewProps = {
  slug: string;
};

export async function BlogPostView({ slug }: BlogPostViewProps) {
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const toc = extractToc(post.contentHtml);
  const related = getRelatedPosts(slug, 3);
  const jsonLd = blogPostingJsonLd({
    title: post.title,
    description: post.excerpt || undefined,
    path: publicPostPath(slug),
    datePublished: post.date,
    dateModified: post.date,
    image: post.featuredImage?.url ?? null,
  });

  return (
    <main className="bg-bg">
      <JsonLd data={jsonLd} />
      {/* Product-style article header — no magazine dark hero */}
      <header className="border-b border-border bg-white">
        <div
          className={`section-shell pt-10 md:pt-14 ${
            post.featuredImage ? "" : "pb-10 md:pb-14"
          }`}
        >
          <div className="mx-auto max-w-3xl">
            <nav aria-label="Breadcrumb" className="text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link
                    href="/"
                    className="text-link transition hover:text-accent"
                  >
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li>
                  <Link
                    href="/blog"
                    className="text-link transition hover:text-accent"
                  >
                    Blog
                  </Link>
                </li>
                <li aria-hidden="true">›</li>
                <li className="max-w-[12rem] truncate text-text sm:max-w-none">
                  {post.title}
                </li>
              </ol>
            </nav>

            <p className="mt-8 eyebrow">Journal</p>
            <h1 className="font-display text-display mt-2 text-heading">
              {post.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
              <span className="relative inline-flex shrink-0">
                <span
                  className="ig-author-ring-pulse pointer-events-none absolute -inset-[3px] rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]"
                  aria-hidden="true"
                />
                <OutboundLink
                  href={site.social.instagram}
                  affiliate={false}
                  className="group relative rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2.5px] shadow-sm transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  aria-label={`${site.authorName} on Instagram`}
                >
                  <span className="relative block size-11 overflow-hidden rounded-full bg-white p-[2px] dark:bg-bg">
                    <span className="relative block size-full overflow-hidden rounded-full bg-surface-soft">
                      <Image
                        src={site.authorPhoto}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover object-top transition duration-300 group-hover:scale-105"
                      />
                    </span>
                  </span>
                </OutboundLink>
              </span>
              <div>
                <p className="text-sm font-semibold text-heading">
                  By{" "}
                  <OutboundLink
                    href={site.social.instagram}
                    affiliate={false}
                    className="transition hover:text-accent"
                  >
                    {site.authorName}
                  </OutboundLink>
                </p>
                <p className="mt-0.5 text-sm text-muted">
                  <time dateTime={post.date}>
                    Updated {formatPostDate(post.date)}
                  </time>
                </p>
              </div>
              </div>
              <SavePostButton slug={slug} />
            </div>
          </div>
        </div>

        {post.featuredImage ? (
          <div className="relative mt-10 aspect-[16/10] w-full bg-surface">
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
          </div>
        ) : null}
      </header>

      <article className="section-shell py-10 md:py-14">
        <div className="mx-auto max-w-3xl">
          {post.excerpt ? (
            <p className="text-lead text-text">{post.excerpt}</p>
          ) : null}

          <aside
            className="panel-nested mt-8 bg-surface-soft px-5 py-4"
            aria-label="Affiliates disclosure"
          >
            <p className="font-display text-sm font-bold text-heading">
              Affiliates disclosure
            </p>
            <p className="mt-1 text-sm leading-relaxed text-text">
              Some links on this page may be affiliate links. If you book or buy
              through them, I may earn a small commission at no extra cost to
              you — thanks for supporting the journal. Read the{" "}
              <Link
                href="/affiliate-disclosure"
                className="font-semibold text-link hover:text-accent"
              >
                full affiliate disclosure
              </Link>
              .
            </p>
          </aside>

          {toc.length > 0 ? (
            <nav
              className="panel mt-8 p-5"
              aria-label="Summary"
            >
              <p className="eyebrow">On this page</p>
              <ul className="mt-3 space-y-2">
                {toc.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                      aria-hidden="true"
                    />
                    <a
                      href={`#${item.id}`}
                      className="text-sm font-medium text-link transition hover:text-accent"
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="mt-10 md:mt-12">
            <PostContent html={post.contentHtml} />
          </div>

          {post.itinerary?.enabled && post.itinerary.days.length > 0 ? (
            <PostItineraryTimeline itinerary={post.itinerary} />
          ) : null}

          <aside className="panel-soft mt-14 flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-soft">
              <Image
                src={site.authorPhoto}
                alt={site.authorName}
                fill
                sizes="64px"
                className="object-cover object-top"
              />
            </div>
            <div>
              <p className="font-display text-lg font-bold text-heading">
                I&apos;m Alex
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text">
                Explorer passionate about travel and discovery. This journal —
                Fernandes Journeys — is where I write down places I&apos;ve been
                so I don&apos;t forget the light, the food, and the roads in
                between.
              </p>
            </div>
          </aside>

          <footer className="mt-12 flex flex-wrap gap-3 border-t border-border pt-8">
            <Link href="/blog" className="btn btn-secondary">
              ← All posts
            </Link>
            <Link href="/destinations" className="btn btn-ink">
              Destinations
            </Link>
          </footer>
        </div>
      </article>

      {related.length > 0 ? (
        <div className="border-t border-border bg-surface-soft">
          <div className="section-shell py-12 md:py-16">
            <RelatedPosts posts={related} />
          </div>
        </div>
      ) : null}
    </main>
  );
}
