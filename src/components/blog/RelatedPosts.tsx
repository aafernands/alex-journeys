import { PostCard } from "@/components/blog/PostCard";
import type { PostMeta } from "@/lib/posts";

type Props = {
  posts: PostMeta[];
};

export function RelatedPosts({ posts }: Props) {
  if (posts.length === 0) return null;

  return (
    <section aria-labelledby="related-posts-heading">
      <h2
        id="related-posts-heading"
        className="font-display text-2xl font-bold tracking-tight text-heading md:text-3xl"
      >
        Related posts
      </h2>
      <p className="mt-2 text-sm text-muted">
        More from the journal — nearby destinations, similar themes, or recent
        notes from the road.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <PostCard post={post} />
          </li>
        ))}
      </ul>
    </section>
  );
}
