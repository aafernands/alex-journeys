"use client";

import Link from "next/link";
import { BookOpen, Compass, MapPin, X } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { HistoryEntry, HistoryKind } from "@/lib/reading-history";

const KIND_LABEL: Record<HistoryKind, string> = {
  story: "Story",
  guide: "Guide",
  place: "Place",
};

const KIND_ICON = { story: BookOpen, guide: Compass, place: MapPin } as const;

function viewedLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 60 * 1000) return "Just now";
  if (diff < 24 * 60 * 60 * 1000) return `${Math.max(1, Math.round(diff / 3_600_000))}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Props = {
  items: HistoryEntry[];
  onCountChange?: (count: number) => void;
};

/** Recently viewed stories, guides, and places. Remove one or clear all. */
export function AccountHistoryList({ items: initial, onCountChange }: Props) {
  const [items, setItems] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(next: HistoryEntry[]) {
    setItems(next);
    onCountChange?.(next.length);
  }

  async function remove(entry: HistoryEntry) {
    const key = `${entry.kind}:${entry.slug}`;
    setBusy(key);
    setError(null);
    try {
      const params = new URLSearchParams({ kind: entry.kind, slug: entry.slug });
      const res = await fetch(`/api/history?${params}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      update(items.filter((e) => !(e.kind === entry.kind && e.slug === entry.slug)));
    } catch {
      setError("Could not remove that. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function clearAll() {
    setBusy("all");
    setError(null);
    try {
      const res = await fetch("/api/history", { method: "DELETE" });
      if (!res.ok) throw new Error();
      update([]);
    } catch {
      setError("Could not clear history. Try again.");
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        action={
          <Link href="/destinations" className="btn btn-secondary">
            Explore places
          </Link>
        }
      >
        Stories, guides, and places you open while signed in will show here.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          Last {items.length} {items.length === 1 ? "page" : "pages"} you opened. Only you can see this.
        </p>
        <button
          type="button"
          onClick={() => void clearAll()}
          disabled={busy !== null}
          className="btn btn-ghost shrink-0 text-xs disabled:opacity-60"
        >
          Clear history
        </button>
      </div>
      <ul className="ui-card divide-y divide-border p-0">
        {items.map((entry) => {
          const key = `${entry.kind}:${entry.slug}`;
          const Icon = KIND_ICON[entry.kind];
          return (
            <li key={key} className="flex items-center">
              <Link
                href={entry.href}
                className="flex min-h-12 min-w-0 flex-1 items-center gap-3 py-2 pl-3 transition hover:bg-surface-soft"
              >
                <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-heading">
                    {entry.title}
                  </span>
                  <span className="block truncate text-xs text-muted" suppressHydrationWarning>
                    {KIND_LABEL[entry.kind]} · {viewedLabel(entry.viewedAt)}
                  </span>
                </span>
              </Link>
              <button
                type="button"
                onClick={() => void remove(entry)}
                disabled={busy !== null}
                aria-label={`Remove ${entry.title} from history`}
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-muted transition hover:text-heading disabled:opacity-60"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="text-xs text-[var(--link)]" role="status">
          {error}
        </p>
      ) : null}
    </div>
  );
}
