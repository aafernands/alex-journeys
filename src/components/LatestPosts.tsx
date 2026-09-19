import Link from "next/link";
import { PostCard } from "@/components/blog/PostCard";
import { Section, SectionHead } from "@/components/ui/Section";
import { getAllPosts } from "@/lib/posts";

export function LatestPosts() {
  const posts = getAllPosts().slice(0, 6);

  return (
    <Section
      id="latest"
      tone="white"
      hairline
      aria-labelledby="latest-heading"
    >
      <SectionHead
        eyebrow="From the journal"
        title="Latest stories."
        titleId="latest-heading"
        action={
          <Link href="/blog" className="btn btn-secondary rounded-sm">
            Browse all stories
            <span aria-hidden="true">→</span>
          </Link>
        }
      />

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <PostCard post={post} priority={i < 3} />
          </li>
        ))}
      </ul>
    </Section>
  );
}
