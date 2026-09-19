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

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <main className="border-b border-sand/50 bg-cream">
      <article className="mx-auto max-w-3xl px-5 py-14 md:px-8 md:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-terracotta">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/blog" className="transition hover:text-terracotta">
                Blog
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="max-w-[14rem] truncate text-ink-soft sm:max-w-none">
              {post.title}
            </li>
          </ol>
        </nav>

        <header className="mt-8">
          <time
            className="text-xs font-semibold uppercase tracking-[0.16em] text-sage"
            dateTime={post.date}
          >
            {formatPostDate(post.date)}
          </time>
          <h1 className="font-display mt-3 text-4xl tracking-tight text-ink sm:text-5xl">
            {post.title}
          </h1>
          {post.excerpt ? (
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              {post.excerpt}
            </p>
          ) : null}
        </header>

        {post.featuredImage ? (
          <div className="relative mt-10 aspect-[16/10] overflow-hidden rounded-2xl bg-cream-deep shadow-[0_16px_40px_-24px_rgba(28,25,23,0.4)]">
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="mt-10 md:mt-12">
          <PostContent html={post.contentHtml} />
        </div>

        <footer className="mt-14 flex flex-wrap gap-3 border-t border-sand/60 pt-8">
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-surface px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-terracotta/40 hover:text-terracotta"
          >
            ← All posts
          </Link>
          <Link
            href="/destinations"
            className="inline-flex items-center justify-center rounded-full bg-terracotta px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-terracotta-deep"
          >
            Destinations
          </Link>
        </footer>
      </article>
    </main>
  );
}
