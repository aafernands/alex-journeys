"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPostDate } from "@/lib/dates";

export type SavedPostRow = {
  slug: string;
  title: string;
  savedAt: string;
  href: string;
  imageUrl?: string | null;
  imageAlt?: string | null;
};

type Props = {
  posts: SavedPostRow[];
};

/**
 * Account dashboard saved-posts list with Remove / Clear all.
 * Uses the same DELETE /api/saved store as SavePostButton.
 */
export function SavedPostsList({ posts }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(posts);
  const [pendingSlug, setPendingSlug] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(posts);
  }, [posts]);

  const unsave = async (slug: string) => {
    setError(null);
    setPendingSlug(slug);
    try {
      const res = await fetch("/api/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (res.status === 503) {
        setError("Saving is temporarily unavailable.");
        return;
      }
      if (!res.ok) {
        setError("Could not remove that save.");
        return;
      }
      setItems((prev) => prev.filter((p) => p.slug !== slug));
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setPendingSlug(null);
    }
  };

  const clearAll = async () => {
    if (items.length === 0) return;
    const ok = window.confirm(
      `Remove all ${items.length} saved ${items.length === 1 ? "post" : "posts"}?`,
    );
    if (!ok) return;

    setError(null);
    setClearing(true);
    try {
      const remaining: SavedPostRow[] = [];
      for (const post of items) {
        const res = await fetch("/api/saved", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: post.slug }),
        });
        if (!res.ok) {
          remaining.push(post);
        }
      }
      setItems(remaining);
      if (remaining.length > 0) {
        setError("Some saves could not be removed. Try again.");
      }
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setClearing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="panel p-6 md:p-8">
        <h3 className="font-display text-lg font-bold text-heading">
          No stories saved yet
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text">
          Open any story and tap <strong>Save</strong> to keep it here for the
          next time you travel.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link href="/blog" className="btn btn-primary w-full sm:w-auto">
            Browse stories
          </Link>
          <Link href="/destinations" className="btn btn-secondary w-full sm:w-auto">
            Places
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          type="button"
          className="text-sm font-semibold text-muted transition hover:text-accent disabled:opacity-60"
          disabled={clearing || pendingSlug !== null}
          onClick={() => void clearAll()}
        >
          {clearing ? "Clearing…" : "Clear all saves"}
        </button>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
        {items.map((post) => {
          const busy = pendingSlug === post.slug || clearing;
          return (
            <li
              key={post.slug}
              className="flex items-stretch gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4"
            >
              <Link
                href={post.href}
                className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface sm:h-16 sm:w-24"
              >
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.imageAlt || post.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span
                    className="flex h-full w-full items-center justify-center text-[10px] font-medium text-muted"
                    aria-hidden="true"
                  >
                    No image
                  </span>
                )}
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <Link
                    href={post.href}
                    className="block truncate font-semibold text-heading transition hover:text-accent"
                  >
                    {post.title}
                  </Link>
                  <time
                    dateTime={post.savedAt}
                    className="text-xs text-muted sm:text-sm"
                  >
                    Saved {formatPostDate(post.savedAt)}
                  </time>
                </div>

                <button
                  type="button"
                  className="inline-flex shrink-0 items-center justify-center self-start rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-heading transition hover:border-accent hover:text-accent disabled:opacity-60 sm:self-center"
                  disabled={busy}
                  onClick={() => void unsave(post.slug)}
                  aria-label={`Remove ${post.title} from saved`}
                >
                  {pendingSlug === post.slug ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {error ? (
        <p className="text-sm text-red-600" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
