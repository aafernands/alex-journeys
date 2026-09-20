"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Check, Copy, Search, Trash2 } from "lucide-react";
import type { MediaItem, MediaSource } from "@/lib/cms/media-types";
import { AddMediaForm } from "./AddMediaForm";

type Props = {
  initialItems: MediaItem[];
  updatedAt?: string;
};

const SOURCE_LABEL: Record<MediaSource, string> = {
  "wordpress-cdn": "Legacy WP CDN",
  upload: "Upload",
  external: "External",
};

export function MediaLibrary({ initialItems, updatedAt }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [q, setQ] = useState("");
  const [source, setSource] = useState<MediaSource | "all">("all");
  const [usedFilter, setUsedFilter] = useState<"all" | "used" | "unused">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [altDraft, setAltDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = items.find((i) => i.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return items.filter((item) => {
      if (source !== "all" && item.source !== source) return false;
      if (usedFilter === "used" && item.usedBy.length === 0) return false;
      if (usedFilter === "unused" && item.usedBy.length > 0) return false;
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
  }, [items, q, source, usedFilter]);

  function selectItem(item: MediaItem) {
    setSelectedId(item.id);
    setAltDraft(item.alt || "");
    setMessage(null);
    setError(null);
    setCopied(false);
  }

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not copy — select the URL manually.");
    }
  }

  async function saveAlt() {
    if (!selected) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/cms/media/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alt: altDraft }),
      });
      const data = (await res.json()) as {
        error?: string;
        item?: MediaItem;
        note?: string;
      };
      if (!res.ok) {
        setError(data.error || "Update failed.");
        return;
      }
      if (data.item) {
        setItems((prev) =>
          prev.map((i) => (i.id === data.item!.id ? data.item! : i)),
        );
      }
      setMessage(data.note || "Alt saved.");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  async function removeItem() {
    if (!selected) return;
    if (
      !window.confirm(
        selected.source === "upload"
          ? `Delete "${selected.id}" from the library and remove the uploaded file?`
          : `Remove "${selected.id}" from the library index? Posts keep their current URLs.`,
      )
    ) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/cms/media/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string; note?: string };
      if (!res.ok) {
        setError(data.error || "Delete failed.");
        return;
      }
      setItems((prev) => prev.filter((i) => i.id !== selected.id));
      setSelectedId(null);
      setMessage(data.note || "Removed.");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setPending(false);
    }
  }

  async function reindex() {
    setReindexing(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/cms/media/reindex", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        note?: string;
        count?: number;
      };
      if (!res.ok) {
        setError(data.error || "Reindex failed.");
        return;
      }
      setMessage(
        data.note ||
          `Rescanned — ${data.count ?? "?"} items. Refresh after deploy for local list sync.`,
      );
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setReindexing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">
            {filtered.length} shown · {items.length} in library
            {updatedAt ? (
              <>
                {" "}
                · indexed{" "}
                {new Date(updatedAt).toLocaleString("en-US", {
                  timeZone: "America/New_York",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                ET
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary text-xs"
          disabled={reindexing}
          onClick={() => void reindex()}
        >
          {reindexing ? "Rescanning…" : "Rescan posts → index"}
        </button>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-border bg-surface-soft px-5 py-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Add media
          </h2>
        </div>
        <div className="p-5">
          <AddMediaForm
            onAdded={(item) => {
              setItems((prev) => {
                if (prev.some((p) => p.id === item.id)) {
                  return prev.map((p) => (p.id === item.id ? item : p));
                }
                return [item, ...prev];
              });
              selectItem(item);
            }}
          />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[14rem] flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search alt, URL, post slug…"
            className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as MediaSource | "all")}
          className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        >
          <option value="all">All sources</option>
          <option value="wordpress-cdn">Legacy WP CDN</option>
          <option value="upload">Uploads</option>
          <option value="external">External</option>
        </select>
        <select
          value={usedFilter}
          onChange={(e) =>
            setUsedFilter(e.target.value as "all" | "used" | "unused")
          }
          className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        >
          <option value="all">Used anywhere</option>
          <option value="used">In a post/page</option>
          <option value="unused">Unused</option>
        </select>
      </div>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-steel" role="status">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => {
            const active = item.id === selectedId;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectItem(item)}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-border hover:border-accent/60"
                } bg-white`}
              >
                <div className="aspect-square overflow-hidden bg-surface-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.url}
                    alt={item.alt || item.id}
                    className="h-full w-full object-cover"
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
                      ? ` · ${item.usedBy.length}`
                      : " · unused"}
                  </p>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 ? (
            <p className="col-span-full text-sm text-muted">
              No images match these filters.
            </p>
          ) : null}
        </div>

        <aside className="panel h-fit space-y-4 p-4 lg:sticky lg:top-6">
          {selected ? (
            <>
              <div className="overflow-hidden rounded-lg border border-border bg-surface-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selected.url}
                  alt={selected.alt || selected.id}
                  className="max-h-48 w-full object-contain"
                />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-muted">
                  {SOURCE_LABEL[selected.source]}
                </p>
                <p className="mt-1 break-all font-mono text-[0.7rem] text-text">
                  {selected.id}
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-heading">URL</label>
                <div className="mt-2 flex gap-2">
                  <input
                    readOnly
                    value={selected.url}
                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface-soft px-3 font-mono text-[0.7rem] text-heading"
                  />
                  <button
                    type="button"
                    className="btn btn-secondary inline-flex h-10 w-10 shrink-0 items-center justify-center p-0"
                    onClick={() => void copyUrl(selected.url)}
                    aria-label="Copy URL"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-steel" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="media-detail-alt"
                  className="text-sm font-semibold text-heading"
                >
                  Alt text
                </label>
                <input
                  id="media-detail-alt"
                  value={altDraft}
                  onChange={(e) => setAltDraft(e.target.value)}
                  className="mt-2 min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
                <button
                  type="button"
                  className="btn btn-secondary mt-2 text-xs disabled:opacity-60"
                  disabled={pending || altDraft === (selected.alt || "")}
                  onClick={() => void saveAlt()}
                >
                  {pending ? "Saving…" : "Save alt"}
                </button>
              </div>
              <div>
                <p className="text-sm font-semibold text-heading">Used by</p>
                {selected.usedBy.length === 0 ? (
                  <p className="mt-1 text-xs text-muted">Not referenced yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {selected.usedBy.map((u) => (
                      <li key={`${u.type}:${u.slug}`}>
                        {u.type === "post" ? (
                          <Link
                            href={`/cms/edit/${u.slug}`}
                            className="text-link hover:text-accent"
                          >
                            post:{u.slug}
                          </Link>
                        ) : (
                          <Link
                            href={`/cms/pages/edit/${u.slug}`}
                            className="text-link hover:text-accent"
                          >
                            page:{u.slug}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="button"
                className="btn btn-secondary inline-flex items-center gap-2 text-xs text-red-700 disabled:opacity-60"
                disabled={pending}
                onClick={() => void removeItem()}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove from library
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">
              Select a thumbnail to copy its URL, edit alt text, or see which
              posts use it.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
