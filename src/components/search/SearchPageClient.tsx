"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SearchInput, type SearchInputHandle } from "@/components/search/SearchInput";
import {
  groupSearchResults,
  searchItems,
  snippetFor,
  type SearchItem,
} from "@/lib/search";

type Props = {
  index: SearchItem[];
  initialQuery: string;
};

export function SearchPageClient({ index, initialQuery }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<SearchInputHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const results = useMemo(
    () => (query.trim() ? searchItems(query, index) : []),
    [query, index],
  );
  const grouped = useMemo(() => groupSearchResults(results), [results]);
  const trimmed = query.trim();

  const syncUrl = useCallback(
    (q: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const next = q.trim();
        const href = next
          ? `/search?q=${encodeURIComponent(next)}`
          : "/search";
        router.replace(href, { scroll: false });
      }, 250);
    },
    [router],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      <SearchInput
        ref={inputRef}
        variant="page"
        id="search-page-q"
        initialQuery={initialQuery}
        autoFocus={!initialQuery}
        onQueryChange={(q) => {
          setQuery(q);
          syncUrl(q);
        }}
      />

      {!trimmed ? (
        <div className="panel-soft mt-10 p-8 text-center md:p-10">
          <p className="font-display text-lg font-bold text-heading">
            Search the journal
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text">
            Try a destination, a guide topic, or a story title — we search
            Stories, Guides, Places, and key pages.
          </p>
          <p className="mt-4 text-sm text-muted">
            Tip: press{" "}
            <kbd className="rounded border border-border bg-white px-1.5 py-0.5 font-sans text-xs font-semibold text-heading">
              /
            </kbd>{" "}
            anywhere to jump here from the header.
          </p>
        </div>
      ) : results.length === 0 ? (
        <div className="panel-soft mt-10 p-8 text-center md:p-10">
          <p className="font-display text-lg font-bold text-heading">
            No results for “{trimmed}”
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text">
            Try a different spelling, a place name (like Iceland), or browse{" "}
            <Link href="/blog" className="text-link hover:text-accent">
              Stories
            </Link>
            ,{" "}
            <Link href="/guides" className="text-link hover:text-accent">
              Guides
            </Link>
            , or{" "}
            <Link href="/destinations" className="text-link hover:text-accent">
              Places
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          <p className="text-sm text-muted" aria-live="polite">
            {results.length} result{results.length === 1 ? "" : "s"} for “
            {trimmed}”
          </p>
          {grouped.map((group) => (
            <section key={group.type} aria-labelledby={`search-${group.type}`}>
              <h2
                id={`search-${group.type}`}
                className="eyebrow text-accent"
              >
                {group.label}
              </h2>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.id}>
                    <ResultCard item={item} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ResultCard({ item }: { item: SearchItem }) {
  const snippet = snippetFor(item);
  return (
    <Link
      href={item.href}
      className="panel-interactive group block p-4 md:px-5 md:py-4"
    >
      <span className="font-display block text-base font-bold text-heading transition group-hover:text-accent md:text-lg">
        {item.title}
      </span>
      {snippet ? (
        <span className="mt-1 block text-sm leading-relaxed text-text">
          {snippet}
        </span>
      ) : null}
      <span className="mt-2 block text-xs font-semibold text-muted">
        {item.href}
      </span>
    </Link>
  );
}
