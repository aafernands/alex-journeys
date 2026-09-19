import Image from "next/image";
import Link from "next/link";
import type { PostMeta } from "@/lib/posts";
import { formatPostDateShort } from "@/lib/posts";

type Props = {
  post: PostMeta;
  priority?: boolean;
};

export function PostCard({ post, priority = false }: Props) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sand/70 bg-surface shadow-[0_10px_40px_-24px_rgba(28,25,23,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-24px_rgba(28,25,23,0.4)]">
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-cream-deep">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition duration-500 group-hover:scale-[1.03]"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <time
            className="text-xs font-medium uppercase tracking-[0.12em] text-muted"
            dateTime={post.date}
          >
            {formatPostDateShort(post.date)}
          </time>
          <h2 className="font-display mt-2 text-2xl leading-snug text-ink transition group-hover:text-terracotta md:text-[1.55rem]">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft line-clamp-3">
              {post.excerpt}
            </p>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-ink transition group-hover:text-terracotta">
            Read story
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
