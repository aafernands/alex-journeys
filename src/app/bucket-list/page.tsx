import type { Metadata } from "next";
import { PostCard } from "@/components/blog/PostCard";
import { SitePage } from "@/components/pages/SitePage";
import { bucketListSlugs } from "@/data/hubs";
import { getPostBySlug } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Bucket List",
  description:
    "Adventure stories and once-in-a-while trips from the journal — curated from Alex’s bucket-list posts.",
};

export default function BucketListPage() {
  const posts = bucketListSlugs
    .map((slug) => getPostBySlug(slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  return (
    <SitePage
      label="Bucket list"
      title="Places worth the early alarm"
      description="A curated tray of adventure and once-in-a-while trips from the journal — rebuilt from the WordPress bucket-list post grid, without the agency clutter."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides/experiences", label: "Experiences" },
        { label: "Bucket list" },
      ]}
    >
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
        {posts.map((post, i) => (
          <li key={post.slug}>
            <PostCard post={post} priority={i < 3} />
          </li>
        ))}
      </ul>
    </SitePage>
  );
}
