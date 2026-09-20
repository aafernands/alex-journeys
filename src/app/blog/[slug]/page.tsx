import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/blog/PostContent";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { JsonLd } from "@/components/JsonLd";
import {
  formatPostDate,
  getPostBySlug,
  getPostSlugs,
  getRelatedPosts,
} from "@/lib/posts";
import { blogPostingJsonLd } from "@/lib/seo";
import { site } from "@/data/content";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post" };
  const description = post.excerpt || `Travel story: ${post.title}`;
  const images = post.featuredImage
    ? [{ url: post.featuredImage.url, alt: post.featuredImage.alt || post.title }]
    : undefined;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.date,
      url: `/blog/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: post.featuredImage ? [post.featuredImage.url] : undefined,
    },
  };
}

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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const toc = extractToc(post.contentHtml);
  const related = getRelatedPosts(slug, 3);
  const jsonLd = blogPostingJsonLd({
    title: post.title,
    description: post.excerpt || undefined,
    path: `/blog/${slug}`,
    datePublished: post.date,
    dateModified: post.date,
    image: post.featuredImage?.url ?? null,
  });

  return (
    <main className="bg-bg">
      <JsonLd data={jsonLd} />
      {/* Product-style article header — no magazine dark hero */}
      <header className="border-b border-border bg-white">
        <div className="section-shell py-10 md:py-14">
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

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div
                className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface-soft text-sm font-bold text-heading"
                aria-hidden="true"
              >
                AF
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">By Alex F.</p>
                <time
                  className="text-sm text-muted"
                  dateTime={post.date}
                >
                  Updated {formatPostDate(post.date)}
                </time>
              </div>
            </div>
          </div>

          {post.featuredImage ? (
            <div className="panel mx-auto mt-10 max-w-4xl overflow-hidden shadow-sm">
              <div className="window-chrome">
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="window-dot" aria-hidden="true" />
                <span className="ml-2 truncate text-xs font-semibold text-muted">
                  Field photo
                </span>
              </div>
              <div className="relative aspect-[16/10] bg-surface">
                <Image
                  src={post.featuredImage.url}
                  alt={post.featuredImage.alt || post.title}
                  fill
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                  className="object-cover object-center"
                />
              </div>
            </div>
          ) : null}
        </div>
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
              you — thanks for supporting the journal.
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
