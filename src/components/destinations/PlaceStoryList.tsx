import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { guideHubs } from "@/data/guides";
import { formatPostDateShort, type PostMeta } from "@/lib/posts";
import { publicPostPath } from "@/lib/public-paths";

type Props = {
  posts: PostMeta[];
  /** Fallback pill label when a post has no guide topic (the place name). */
  placeName: string;
};

/**
 * Topic label for the pill: the post's Guides hub (CMS `guideHubs`, or the hub
 * that links to it), falling back to the place. Posts carry no category or
 * author fields, so there is no author line.
 */
function storyTopic(post: PostMeta, placeName: string): string {
  const path = publicPostPath(post.slug);
  const hub =
    guideHubs.find((item) => (post.guideHubs ?? []).includes(item.slug)) ??
    guideHubs.find((item) => item.links.some((link) => link.kind === "post" && link.href === path));
  return hub?.title || placeName;
}

/**
 * "Stories from this place" on place pages: a divided news-style list.
 * Square thumb on the left; topic pill, clock + date, and a 2-line title on the right.
 * The whole row is one link.
 */
export function PlaceStoryList({ posts, placeName }: Props) {
  return (
    <ul className="mt-2 divide-y divide-border">
      {posts.map((post) => (
        <li key={post.slug}>
          <Link
            href={publicPostPath(post.slug)}
            className="group flex items-start gap-3 rounded-[var(--radius-control)] py-4 sm:gap-4"
          >
            <div className="relative size-[88px] shrink-0 overflow-hidden rounded-xl bg-surface sm:size-24 md:size-28">
              {post.featuredImage ? (
                <Image
                  src={post.featuredImage.url}
                  alt=""
                  fill
                  sizes="112px"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="rounded-full bg-accent/12 px-2 py-0.5 text-ds-caption font-semibold uppercase tracking-[0.08em] text-accent-deep">
                  {storyTopic(post, placeName)}
                </span>
                <span className="inline-flex items-center gap-1 text-ds-caption text-muted">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  <time dateTime={post.date}>{formatPostDateShort(post.date)}</time>
                </span>
              </p>
              <p className="font-display mt-1.5 line-clamp-2 text-[1.0625rem] font-bold leading-[1.25] text-heading transition group-hover:text-accent md:text-lg">
                {post.title}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
