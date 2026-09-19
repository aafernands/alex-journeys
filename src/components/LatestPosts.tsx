import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/posts";

export function LatestPosts() {
  const posts = getAllPosts().slice(0, 6);

  return (
    <section
      id="latest"
      className="border-t border-surface bg-white"
      aria-labelledby="latest-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20">
        <div className="mb-10 flex flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-label text-muted">From the journal</p>
            <h2
              id="latest-heading"
              className="font-display mt-2 text-display uppercase tracking-tight text-heading"
            >
              Latest blog posts
            </h2>
          </div>
          <Link
            href="/blog"
            className="text-sm font-bold uppercase tracking-wide text-link transition hover:text-accent"
          >
            Browse the full blog →
          </Link>
        </div>

        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
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
