import Image from "next/image";
import Link from "next/link";
import type { PostMeta } from "@/lib/post-types";
import { formatPostDateShort } from "@/lib/dates";

type Props = {
  post: PostMeta;
  priority?: boolean;
};

export function PostCard({ post, priority = false }: Props) {
  return (
    <article className="panel-interactive group relative flex h-full flex-col overflow-hidden">
      <span
        className="journal-tape absolute left-4 top-3 z-10 rotate-[-3deg] px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-heading opacity-90 transition group-hover:opacity-100"
        aria-hidden="true"
      >
        Entry
      </span>
      <Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-dashed border-border bg-surface">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage.url}
              alt={post.featuredImage.alt || post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              No image
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col bg-white p-5 md:p-6">
          <time
            className="text-xs font-semibold uppercase tracking-[0.06em] text-muted"
            dateTime={post.date}
          >
            {formatPostDateShort(post.date)}
          </time>
          <h2 className="font-display mt-2 text-lg font-semibold leading-snug tracking-tight text-heading md:text-xl">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="mt-3 flex-1 text-sm leading-relaxed text-text line-clamp-3">
              {post.excerpt}
            </p>
          ) : null}
          <span className="mt-5 inline-flex items-center gap-1.5 border-t border-dashed border-border pt-4 text-sm font-semibold text-link transition group-hover:text-accent">
            Read story
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
