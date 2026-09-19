import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostContent } from "@/components/blog/PostContent";
import {
  formatPostDate,
  getPostBySlug,
  getPostSlugs,
} from "@/lib/posts";

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
  return {
    title: post.title,
    description: post.excerpt || `Travel story: ${post.title}`,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.date,
      images: post.featuredImage ? [{ url: post.featuredImage.url }] : undefined,
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

  return (
    <main className="bg-white">
      {/* Dark full-bleed hero */}
      <header className="relative flex min-h-[50vh] items-end overflow-hidden bg-near-black md:min-h-[58vh]">
        {post.featuredImage ? (
          <Image
            src={post.featuredImage.url}
            alt={post.featuredImage.alt || post.title}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        ) : null}
        <div
          className="absolute inset-0 bg-gradient-to-t from-near-black/85 via-near-black/45 to-near-black/50"
          aria-hidden="true"
        />
        <div className="relative z-10 mx-auto w-full max-w-3xl px-5 pb-12 pt-36 md:px-8 md:pb-16 md:pt-44">
          <nav aria-label="Breadcrumb" className="text-sm text-white/70">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="text-link transition hover:text-white">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li>
                <Link
                  href="/blog"
                  className="text-link transition hover:text-white"
                >
                  Blog
                </Link>
              </li>
              <li aria-hidden="true">›</li>
              <li className="max-w-[12rem] truncate text-white/80 sm:max-w-none">
                {post.title}
              </li>
            </ol>
          </nav>
          <h1 className="font-display mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-[2rem] md:leading-snug">
            {post.title}
          </h1>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14">
        {/* Byline */}
        <div className="flex flex-wrap items-center gap-4 border-b border-surface pb-8">
          <div
            className="flex size-14 items-center justify-center rounded-full bg-surface text-lg font-bold text-heading ring-2 ring-accent"
            aria-hidden="true"
          >
            AF
          </div>
          <div>
            <p className="font-semibold text-heading">By Alex F.</p>
            <time
              className="text-sm text-muted"
              dateTime={post.date}
            >
              Article updated on {formatPostDate(post.date)}
            </time>
          </div>
        </div>

        {post.excerpt ? (
          <p className="mx-auto mt-8 max-w-xl text-center text-lg italic leading-relaxed text-heading md:text-xl">
            {post.excerpt}
          </p>
        ) : null}

        {/* Affiliates disclosure */}
        <aside
          className="mt-8 rounded-lg border border-surface bg-surface-soft px-5 py-4"
          aria-label="Affiliates disclosure"
        >
          <p className="font-display text-sm font-bold text-heading">
            Affiliates Disclosure
          </p>
          <p className="mt-1 text-sm italic leading-relaxed text-text">
            Some links on this page may be affiliate links. If you book or buy
            through them, I may earn a small commission at no extra cost to you
            — thanks for supporting the journal.
          </p>
        </aside>

        {/* Summary / TOC */}
        {toc.length > 0 ? (
          <nav
            className="mt-8 border-y border-steel/30 py-5"
            aria-label="Summary"
          >
            <p className="font-display text-base font-bold text-heading">
              Summary
            </p>
            <ul className="mt-3 space-y-2">
              {toc.map((item) => (
                <li key={item.id} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 size-2.5 shrink-0 bg-steel"
                    aria-hidden="true"
                  />
                  <a
                    href={`#${item.id}`}
                    className="text-link underline decoration-steel/40 underline-offset-2 transition hover:text-accent"
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

        {/* Author card — stays in flow, no float over body */}
        <aside className="mt-14 flex flex-col gap-5 rounded-2xl border border-surface bg-surface-soft p-6 sm:flex-row sm:items-start">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-bold text-heading ring-2 ring-accent"
            aria-hidden="true"
          >
            AF
          </div>
          <div>
            <p className="font-display text-lg font-bold text-heading">
              I&apos;m Alex
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text">
              Explorer passionate about travel and discovery. This journal —
              Alex Journly / Fernandes Journeys — is where I write down places
              I&apos;ve been so I don&apos;t forget the light, the food, and the
              roads in between.
            </p>
          </div>
        </aside>

        <footer className="mt-12 flex flex-wrap gap-3 border-t border-surface pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-md border border-heading/15 bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-heading transition hover:border-accent hover:text-accent"
          >
            ← All posts
          </Link>
          <Link
            href="/destinations"
            className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-accent-deep"
          >
            Destinations
          </Link>
        </footer>
      </article>
    </main>
  );
}
