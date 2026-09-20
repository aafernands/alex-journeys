"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Check,
  MessageSquareWarning,
  Trash2,
  X,
} from "lucide-react";
import type { Comment, CommentStatus } from "@/lib/comment-types";
import { publicPostPath } from "@/lib/public-paths";

type Filter = CommentStatus | "all";

type Props = {
  initialComments: Comment[];
  initialFilter: Filter;
  pendingCount: number;
  titleBySlug: Record<string, string>;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "all", label: "All" },
];

export function CommentsModerationList({
  initialComments,
  initialFilter,
  pendingCount: initialPending,
  titleBySlug,
}: Props) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [comments, setComments] = useState(initialComments);
  const [pendingCount, setPendingCount] = useState(initialPending);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (next: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/cms/comments?status=${encodeURIComponent(next)}`,
      );
      const data = (await res.json().catch(() => null)) as {
        comments?: Comment[];
        pendingCount?: number;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not load comments.");
        return;
      }
      setComments(Array.isArray(data?.comments) ? data!.comments! : []);
      if (typeof data?.pendingCount === "number") {
        setPendingCount(data.pendingCount);
      }
      setFilter(next);
    } catch {
      setError("Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, []);

  const moderate = async (id: string, status: CommentStatus) => {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/cms/comments/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json().catch(() => null)) as {
        comment?: Comment;
        error?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not update.");
        return;
      }
      const updated = data?.comment;
      if (!updated) {
        await load(filter);
        return;
      }
      setComments((prev) => {
        if (filter === "all" || filter === updated.status) {
          return prev.map((c) => (c.id === id ? updated : c));
        }
        return prev.filter((c) => c.id !== id);
      });
      // Refresh pending count cheaply
      try {
        const countRes = await fetch("/api/cms/comments?pendingCount=1");
        const countData = (await countRes.json()) as { pendingCount?: number };
        if (typeof countData.pendingCount === "number") {
          setPendingCount(countData.pendingCount);
        }
      } catch {
        /* ignore */
      }
    } catch {
      setError("Could not update.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/cms/comments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not delete.");
        return;
      }
      setComments((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
      try {
        const countRes = await fetch("/api/cms/comments?pendingCount=1");
        const countData = (await countRes.json()) as { pendingCount?: number };
        if (typeof countData.pendingCount === "number") {
          setPendingCount(countData.pendingCount);
        }
      } catch {
        /* ignore */
      }
    } catch {
      setError("Could not delete.");
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = useMemo(
    () =>
      ({
        pending:
          "bg-amber-500/15 text-amber-800 dark:text-amber-200 ring-amber-500/30",
        approved:
          "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 ring-emerald-500/30",
        rejected:
          "bg-red-500/15 text-red-800 dark:text-red-200 ring-red-500/30",
      }) as Record<CommentStatus, string>,
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.id;
          const label =
            f.id === "pending" && pendingCount > 0
              ? `${f.label} (${pendingCount})`
              : f.label;
          return (
            <button
              key={f.id}
              type="button"
              disabled={loading}
              onClick={() => void load(f.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
                active
                  ? "border-accent bg-accent/15 text-heading"
                  : "border-border bg-white text-text hover:border-accent hover:text-accent"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="status">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : comments.length === 0 ? (
        <div className="panel flex items-start gap-3 p-6">
          <MessageSquareWarning
            className="mt-0.5 h-5 w-5 shrink-0 text-muted"
            aria-hidden
          />
          <div>
            <p className="font-semibold text-heading">No comments here</p>
            <p className="mt-1 text-sm text-muted">
              {filter === "pending"
                ? "Nothing waiting for review."
                : "Try another filter."}
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
          {comments.map((c) => {
            const title = titleBySlug[c.slug] ?? c.slug;
            const busy = busyId === c.id;
            return (
              <li key={c.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ring-1 ${statusBadge[c.status]}`}
                      >
                        {c.status}
                      </span>
                      {c.parentId ? (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Reply
                        </span>
                      ) : null}
                      <time
                        dateTime={c.createdAt}
                        className="text-xs text-muted"
                      >
                        {formatWhen(c.createdAt)}
                      </time>
                    </div>
                    <p className="text-sm font-semibold text-heading">
                      {c.authorName}
                      <span className="font-normal text-muted">
                        {" "}
                        on{" "}
                        <Link
                          href={publicPostPath(c.slug)}
                          className="text-link hover:text-accent"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {title}
                        </Link>
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">
                      {c.body}
                    </p>
                    <p className="text-xs text-muted">
                      slug: <code className="rounded bg-surface-soft px-1">{c.slug}</code>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {c.status !== "approved" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void moderate(c.id, "approved")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-heading transition hover:border-emerald-600 hover:text-emerald-700 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Approve
                      </button>
                    ) : null}
                    {c.status !== "rejected" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void moderate(c.id, "rejected")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-heading transition hover:border-amber-600 hover:text-amber-800 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        Reject
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void remove(c.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-semibold text-heading transition hover:border-red-600 hover:text-red-700 disabled:opacity-60"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
