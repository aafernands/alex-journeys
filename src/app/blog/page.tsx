import type { Metadata } from "next";
import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Trip notes, destination guides, and travel tips from Alex Journly — migrated from alexjournly.com.",
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <main className="bg-white">
      <div className="section-shell py-10 md:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="text-link transition hover:text-accent">
                Home
              </Link>
            </li>
            <li aria-hidden="true">›</li>
            <li className="text-text">Blog</li>
          </ol>
        </nav>

        <p className="mt-8 eyebrow">Journal</p>
        <h1 className="font-display mt-2 text-display text-heading">Blog</h1>
        <p className="mt-4 max-w-2xl text-lead text-text">
          {posts.length} stories from the road — destination guides, trip notes,
          and practical travel tips.
        </p>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
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
