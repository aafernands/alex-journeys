"use client";

import { useMemo, useState } from "react";
import { PostCard } from "@/components/blog/PostCard";
import { getAllDestinations } from "@/data/destinations";
import { guideHubs, postGuideTopics } from "@/data/guides";

/** Minimal post shape for filter UI — avoid importing @/lib/posts (node:fs). */
type FilterPost = {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  featuredImage: {
    url: string;
    alt: string;
    width?: number;
    height?: number;
  } | null;
  destinations: string[];
  guideHubs?: string[];
};

type Mode = "all" | "place" | "guide";

type Props = {
  posts: FilterPost[];
};

export function BlogFilters({ posts }: Props) {
  const places = getAllDestinations();
  const [mode, setMode] = useState<Mode>("all");
  const [placeSlug, setPlaceSlug] = useState<string>("");
  const [guideSlug, setGuideSlug] = useState<string>("");

  const filtered = useMemo(() => {
    if (mode === "place" && placeSlug) {
      return posts.filter((p) => p.destinations.includes(placeSlug));
    }
    if (mode === "guide" && guideSlug) {
      return posts.filter((p) => {
        const fromHubs = (p.guideHubs ?? []).includes(guideSlug);
        const fromCurated = (postGuideTopics[p.slug] || []).includes(guideSlug);
        return fromHubs || fromCurated;
      });
    }
    return posts;
  }, [mode, placeSlug, guideSlug, posts]);

  return (
    <div>
      <div
        className="hub-follow flex flex-wrap gap-2"
        role="tablist"
        aria-label="Filter stories"
      >
        {(
          [
            { id: "all", label: "All" },
            { id: "place", label: "By Place" },
            { id: "guide", label: "By Guide topic" },
          ] as const
        ).map((tab) => {
          const active = mode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "border-ink bg-ink text-on-solid"
                  : "border-border bg-white text-text hover:border-heading/30 hover:bg-surface-soft"
              }`}
              onClick={() => {
                setMode(tab.id);
                if (tab.id === "all") {
                  setPlaceSlug("");
                  setGuideSlug("");
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {mode === "place" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {places.map((place) => {
            const active = placeSlug === place.slug;
            return (
              <button
                key={place.slug}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-white text-text hover:bg-surface-soft"
                }`}
                onClick={() => setPlaceSlug(place.slug)}
              >
                {place.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {mode === "guide" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {guideHubs.map((hub) => {
            const active = guideSlug === hub.slug;
            return (
              <button
                key={hub.slug}
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  active
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-white text-text hover:bg-surface-soft"
                }`}
                onClick={() => setGuideSlug(hub.slug)}
              >
                {hub.title}
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="mt-6 text-sm text-muted">
        Showing {filtered.length} of {posts.length}{" "}
        {filtered.length === 1 ? "story" : "stories"}
        {mode === "place" && placeSlug
          ? ` in ${places.find((p) => p.slug === placeSlug)?.name ?? "place"}`
          : ""}
        {mode === "guide" && guideSlug
          ? ` · ${guideHubs.find((h) => h.slug === guideSlug)?.title ?? "topic"}`
          : ""}
      </p>

      {filtered.length > 0 ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {filtered.map((post, i) => (
            <li key={post.slug}>
              <PostCard post={post} priority={i < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="panel-soft mt-8 border-dashed px-6 py-12 text-center">
          <p className="text-text">
            No stories match this filter yet. Try another place or guide topic.
          </p>
        </div>
      )}
    </div>
  );
}
