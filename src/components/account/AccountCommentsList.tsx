"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import type { CommentStatus } from "@/lib/comment-types";

/** Serializable subset of a reader comment for My Journey. */
export type AccountCommentRow = {
  id: string;
  body: string;
  status: CommentStatus;
  createdAt: string;
  postTitle: string;
  href: string;
  isReply: boolean;
};

const STATUS: Record<CommentStatus, { label: string; className: string }> = {
  approved: { label: "Published", className: "bg-surface-soft text-heading ring-1 ring-border" },
  pending: { label: "Pending", className: "bg-accent/15 text-accent-deep" },
  rejected: { label: "Not published", className: "bg-surface-soft text-muted" },
};

function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type Props = {
  comments: AccountCommentRow[];
  onCountChange?: (count: number) => void;
};

/** The reader's own comments with a moderation pill, a link back, and delete. */
export function AccountCommentsList({ comments: initial, onCountChange }: Props) {
  const [comments, setComments] = useState(initial);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    if (!window.confirm("Delete this comment? Replies to it are removed too.")) return;
    setDeleting(id);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not delete that comment.");
        return;
      }
      const next = comments.filter((c) => c.id !== id);
      setComments(next);
      onCountChange?.(next.length);
    } catch {
      setError("Could not delete that comment.");
    } finally {
      setDeleting(null);
    }
  }

  if (comments.length === 0) {
    return (
      <EmptyState
        action={
          <Link href="/blog" className="btn btn-secondary">
            Browse stories
          </Link>
        }
      >
        Comments you leave on stories will be listed here, with links back.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        New comments stay Pending until they’re approved, then they’re Published on the story.
      </p>
      <ul className="ui-card divide-y divide-border p-0">
        {comments.map((comment) => {
          const pill = STATUS[comment.status];
          return (
            <li key={comment.id} className="p-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
                <Link
                  href={comment.href}
                  className="min-w-0 flex-1 truncate text-sm font-semibold text-heading hover:text-accent"
                >
                  {comment.isReply ? "Reply on " : ""}
                  {comment.postTitle}
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill.className}`}
                >
                  {pill.label}
                </span>
              </div>
              <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-text">{comment.body}</p>
              <div className="flex items-center justify-between gap-2">
                <time dateTime={comment.createdAt} className="text-xs text-muted" suppressHydrationWarning>
                  {shortDate(comment.createdAt)}
                </time>
                <button
                  type="button"
                  onClick={() => void remove(comment.id)}
                  disabled={deleting !== null}
                  className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-muted hover:text-[var(--link)] disabled:opacity-60"
                >
                  {deleting === comment.id ? "Deleting…" : "Delete"}
                </button>
              </div>
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
