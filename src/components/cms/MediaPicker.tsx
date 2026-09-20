"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { MediaItem, MediaSource } from "@/lib/cms/media-types";

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (item: { url: string; alt: string }) => void;
  title?: string;
};

const SOURCE_LABEL: Record<MediaSource, string> = {
  "wordpress-cdn": "Legacy WP CDN",
  upload: "Upload",
  external: "External",
};

export function MediaPicker({
  open,
  onClose,
  onSelect,
  title = "Choose from library",
}: Props) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [source, setSource] = useState<MediaSource | "all">("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch("/api/cms/media");
        const data = (await res.json()) as {
          error?: string;
          items?: MediaItem[];
        };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Could not load media.");
          return;
        }
        if (!cancelled) setItems(data.items || []);
      } catch {
        if (!cancelled) setError("Network error loading media.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((item) => {
      if (source !== "all" && item.source !== source) return false;
      if (!query) return true;
      const hay = [
        item.alt,
        item.url,
        item.id,
        ...item.usedBy.map((u) => `${u.type}:${u.slug}`),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(query);
    });
  }, [items, q, source]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-t-2xl border border-border bg-surface shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div>
            <p className="font-display text-lg font-bold text-heading">{title}</p>
            <p className="text-xs text-muted">
              {loading ? "Loading…" : `${filtered.length} of ${items.length} images`}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary inline-flex h-10 w-10 items-center justify-center p-0"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-soft px-4 py-3 sm:px-5">
          <div className="relative min-w-[12rem] flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search alt, URL, post slug…"
              className="min-h-10 w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as MediaSource | "all")}
            className="min-h-10 rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          >
            <option value="all">All sources</option>
            <option value="wordpress-cdn">Legacy WP CDN</option>
            <option value="upload">Uploads</option>
            <option value="external">External</option>
          </select>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {error ? (
            <p className="text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {!loading && !error && filtered.length === 0 ? (
            <p className="text-sm text-muted">
              No images match. Add media under CMS → Media, or clear filters.
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="group overflow-hidden rounded-xl border border-border bg-white text-left transition hover:border-accent hover:ring-2 hover:ring-accent/20"
                onClick={() => {
                  onSelect({ url: item.url, alt: item.alt || "" });
                  onClose();
                }}
              >
                <div className="aspect-square overflow-hidden bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt || item.id}
                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                </div>
                <div className="space-y-1 p-2.5">
                  <p className="line-clamp-2 text-xs font-medium text-heading">
                    {item.alt || item.id}
                  </p>
                  <p className="text-[0.65rem] text-muted">
                    {SOURCE_LABEL[item.source]}
                    {item.usedBy.length
                      ? ` · ${item.usedBy.length} use${item.usedBy.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
