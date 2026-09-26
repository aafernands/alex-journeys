"use client";

import Image from "next/image";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { COMMENT_MAX_BODY, type Comment } from "@/lib/comment-types";

type Props = {
  slug: string;
};

type Thread = {
  parent: Comment;
  replies: Comment[];
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Avatar({
  name,
  image,
  size = 40,
}: {
  name: string;
  image: string | null;
  size?: number;
}) {
  if (image) {
    return (
      <span
        className="relative shrink-0 overflow-hidden rounded-full border border-border bg-surface-soft"
        style={{ width: size, height: size }}
      >
        <Image
          src={image}
          alt=""
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft text-xs font-bold text-heading"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function CommentSection({ slug }: Props) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user?.id);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [pending, setPending] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /** The reader's own comments on this story that are still waiting for moderation. */
  const [mine, setMine] = useState<Comment[]>([]);
  const openReaderLogin = useReaderLoginPrompt();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`);
      if (res.status === 503) {
        setUnavailable(true);
        setComments([]);
        return;
      }
      if (!res.ok) {
        setError("Could not load comments.");
        return;
      }
      const data = (await res.json()) as { comments?: Comment[] };
      setComments(Array.isArray(data.comments) ? data.comments : []);
      setUnavailable(false);
      setError(null);
    } catch {
      setError("Could not load comments.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!signedIn) {
      setMine([]);
      return;
    }
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/comments/mine?slug=${encodeURIComponent(slug)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { comments?: Comment[] };
        if (!alive || !Array.isArray(data.comments)) return;
        setMine(data.comments.filter((c) => c.status === "pending"));
      } catch {
        // Own pending comments are a nicety; the public list still loads.
      }
    })();
    return () => {
      alive = false;
    };
  }, [signedIn, slug]);

  const threads = useMemo((): Thread[] => {
    const seen = new Set(comments.map((c) => c.id));
    const shown = [...comments, ...mine.filter((c) => !seen.has(c.id))].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
    const tops = shown.filter((c) => !c.parentId);
    const byParent = new Map<string, Comment[]>();
    for (const c of shown) {
      if (!c.parentId) continue;
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    return tops.map((parent) => ({
      parent,
      replies: byParent.get(parent.id) ?? [],
    }));
  }, [comments, mine]);

  const count = comments.length;

  const askToSignIn = () => {
    const path = window.location.pathname + window.location.search + "#comments";
    openReaderLogin({ returnTo: path, intro: "Sign in to comment on this story." });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setThanks(null);
    if (!signedIn) return;
    const text = body.trim();
    if (!text) {
      setError("Comment cannot be empty.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          body: text,
          parentId: replyTo?.id ?? null,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        comment?: Comment;
      } | null;
      if (res.status === 503) {
        setUnavailable(true);
        setError("Comments are temporarily unavailable.");
        return;
      }
      if (!res.ok) {
        setError(data?.error ?? "Could not post comment.");
        return;
      }
      setBody("");
      setReplyTo(null);
      const created = data?.comment;
      if (created?.id) {
        if (created.status === "approved") {
          setComments((prev) => [...prev, created]);
        } else {
          setMine((prev) => [...prev, created]);
        }
      }
      setThanks(
        data?.message ??
          "Thanks — your comment is awaiting moderation.",
      );
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this comment? Replies to it are removed too.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(data?.error ?? "Could not delete.");
        return;
      }
      setComments((prev) =>
        prev.filter((c) => c.id !== id && c.parentId !== id),
      );
      setMine((prev) => prev.filter((c) => c.id !== id && c.parentId !== id));
    } catch {
      setError("Could not delete.");
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (c: Comment) =>
    signedIn &&
    (c.authorId === session?.user?.id || session?.user?.isAdmin === true);

  return (
    <section
      id="comments"
      className="mt-14 scroll-mt-24 border-t border-border pt-10"
      aria-labelledby="comments-heading"
    >
      <h2
        id="comments-heading"
        className="font-display text-2xl font-bold text-heading outline-none"
      >
        Comments
        {!loading && !unavailable ? (
          <span className="ml-2 text-base font-semibold text-muted">
            ({count})
          </span>
        ) : null}
      </h2>

      {unavailable ? (
        <p className="mt-4 text-sm text-muted" role="status">
          Comments are temporarily unavailable.
        </p>
      ) : null}

      {!unavailable ? (
        <div className="mt-6">
          {status === "loading" ? (
            <p className="text-sm text-muted">Checking sign-in…</p>
          ) : signedIn ? (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
              {replyTo ? (
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  Replying to{" "}
                  <strong className="text-heading">{replyTo.authorName}</strong>
                  <button
                    type="button"
                    className="text-link hover:text-accent"
                    onClick={() => setReplyTo(null)}
                  >
                    Cancel
                  </button>
                </p>
              ) : null}
              <label className="block">
                <span className="sr-only">Your comment</span>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={COMMENT_MAX_BODY}
                  placeholder="Share a thought from the road…"
                  className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                  disabled={pending}
                />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted">
                  {body.trim().length}/{COMMENT_MAX_BODY} · Comments are moderated
                  before they appear.
                </p>
                <button
                  type="submit"
                  disabled={pending || !body.trim()}
                  className="btn btn-primary disabled:opacity-60"
                >
                  {pending
                    ? "Sending…"
                    : replyTo
                      ? "Post reply"
                      : "Post comment"}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-soft px-4 py-3">
              <p className="text-sm text-text">Sign in to comment. Comments are moderated before they appear.</p>
              <button type="button" onClick={askToSignIn} className="btn btn-secondary">
                Sign in to comment
              </button>
            </div>
          )}

          {thanks ? (
            <p
              className="mt-3 rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-heading"
              role="status"
            >
              {thanks}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-[var(--link)]" role="status">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 space-y-6">
        {loading ? (
          <p className="text-sm text-muted">Loading comments…</p>
        ) : threads.length === 0 && !unavailable ? (
          <p className="text-sm text-muted">No comments yet. Be the first.</p>
        ) : (
          threads.map(({ parent, replies }) => (
            <article
              key={parent.id}
              className="rounded-xl border border-border bg-white p-4 sm:p-5"
            >
              <CommentRow
                comment={parent}
                canDelete={canDelete(parent)}
                deleting={deletingId === parent.id}
                onReply={
                  signedIn && parent.status !== "pending"
                    ? () => {
                        setReplyTo(parent);
                        setThanks(null);
                      }
                    : undefined
                }
                onDelete={() => void onDelete(parent.id)}
              />
              {replies.length > 0 ? (
                <ul className="mt-4 space-y-4 border-l-2 border-border pl-4 sm:pl-5">
                  {replies.map((reply) => (
                    <li key={reply.id}>
                      <CommentRow
                        comment={reply}
                        canDelete={canDelete(reply)}
                        deleting={deletingId === reply.id}
                        onDelete={() => void onDelete(reply.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}

function CommentRow({
  comment,
  canDelete,
  deleting,
  onReply,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  deleting: boolean;
  onReply?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-3">
      <Avatar name={comment.authorName} image={comment.authorImage} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <p className="text-sm font-semibold text-heading">
            {comment.authorName}
          </p>
          <time
            dateTime={comment.createdAt}
            className="text-xs text-muted"
          >
            {formatWhen(comment.createdAt)}
          </time>
          {comment.status === "pending" ? (
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent-deep">
              Pending · only you can see this
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-text">
          {comment.body}
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {onReply ? (
            <button
              type="button"
              onClick={onReply}
              className="-ml-2 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-link hover:text-accent"
            >
              Reply
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex min-h-11 items-center px-2 text-xs font-semibold text-muted hover:text-[var(--link)] disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
