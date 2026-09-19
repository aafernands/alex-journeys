import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostCard } from "@/components/blog/PostCard";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { getTopic, getTopicsBySection, getTopicPosts } from "@/lib/topics";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getTopicsBySection("experiences").map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const topic = getTopic("experiences", slug);
  if (!topic) return { title: "Experiences" };
  return { title: topic.title, description: topic.description };
}

export default async function ExperienceTopicPage({ params }: PageProps) {
  const { slug } = await params;
  const topic = getTopic("experiences", slug);
  if (!topic) notFound();
  const posts = getTopicPosts(topic);

  return (
    <SitePage
      label="Experiences"
      title={topic.title}
      description={topic.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/experiences", label: "Experiences" },
        { label: topic.title },
      ]}
    >
      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface-soft px-3 py-1.5 text-sm font-semibold text-heading">
        <NavIcon name={topic.icon} size={16} className="text-accent" />
        {posts.length} {posts.length === 1 ? "story" : "stories"} from the journal
      </div>

      {posts.length > 0 ? (
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <PostCard post={post} priority={i < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 text-text">
          More notes coming soon. Meanwhile, browse the{" "}
          <Link href="/blog" className="text-link hover:text-accent">
            full blog
          </Link>
          .
        </p>
      )}
    </SitePage>
  );
}
