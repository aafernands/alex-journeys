import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/posts";

export function LatestPosts() {
  const posts = getAllPosts().slice(0, 6);

  return (
    <section
      id="latest"
      className="border-t border-border bg-surface-soft"
      aria-labelledby="latest-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-4 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div className="section-head">
            <p className="eyebrow">From the journal</p>
            <h2
              id="latest-heading"
              className="font-display mt-2 text-display text-heading"
            >
              Latest blog posts.
            </h2>
          </div>
          <Link href="/blog" className="btn btn-secondary self-start">
            Browse the full blog
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <PostCard post={post} priority={i < 3} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
