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
    <article className="panel-interactive group flex h-full flex-col overflow-hidden">
      <Link href={`/${post.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/10] overflow-hidden border-b border-border bg-surface">
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
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <time
            className="text-xs font-semibold uppercase tracking-[0.06em] text-muted"
            dateTime={post.date}
          >
            {formatPostDateShort(post.date)}
          </time>
          <h2 className="card-title mt-2">
            {post.title}
          </h2>
          {post.excerpt ? (
            <p className="card-body mt-3 flex-1 line-clamp-3">
              {post.excerpt}
            </p>
          ) : null}
          <span className="card-cta mt-5 inline-flex items-center gap-1.5 transition group-hover:text-accent">
            Read story
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </Link>
    </article>
  );
}
