import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Trip notes, destination guides, and travel tips from Fernandes Journeys — migrated from alexjournly.com.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="border-b border-sand/50 bg-cream">
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition hover:text-terracotta">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-ink-soft">Blog</li>
          </ol>
        </nav>

        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
          Journal
        </p>
        <h1 className="font-display mt-2 text-4xl tracking-tight text-ink sm:text-5xl md:text-6xl">
          Blog
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-soft">
          {posts.length} stories from the road — destination guides, trip notes,
          and practical travel tips. Originally published on alexjournly.com.
        </p>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <PostCard post={post} priority={i < 3} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
