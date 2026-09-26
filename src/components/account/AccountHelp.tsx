"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, LifeBuoy } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  READER_STATUS_LABELS,
  type ReaderTicket,
  type ReaderTicketMessage,
  type ReaderTicketStatus,
} from "@/lib/support-tickets";

const STATUS_STYLE: Record<ReaderTicketStatus, string> = {
  active: "bg-surface-soft text-heading ring-1 ring-border",
  waiting: "bg-accent/15 text-accent-deep ring-1 ring-accent/30",
  resolved: "bg-surface-soft text-muted ring-1 ring-border",
};

function StatusPill({ status }: { status: ReaderTicketStatus }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}
    >
      {READER_STATUS_LABELS[status]}
    </span>
  );
}

function day(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

type Detail = { request: ReaderTicket; messages: ReaderTicketMessage[] };

/**
 * My Journey → Help. A way to ask for help, the reader's own requests, and
 * each conversation with a reply box. Loads only when the section opens.
 */
export function AccountHelp({ emailUnconfirmed = false }: { emailUnconfirmed?: boolean }) {
  const [requests, setRequests] = useState<ReaderTicket[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [openNumber, setOpenNumber] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/support/my-requests", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { requests?: ReaderTicket[]; error?: string };
        if (!res.ok) throw new Error(data.error || "Your requests aren’t available right now.");
        if (alive) {
          setRequests(data.requests ?? []);
          setListError(null);
        }
      } catch (err) {
        if (alive) setListError(err instanceof Error ? err.message : "Your requests aren’t available right now.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  function reload() {
    setListError(null);
    setRequests(null);
    setReloadKey((k) => k + 1);
  }

  if (openNumber) {
    return (
      <RequestDetail
        ticketNumber={openNumber}
        onBack={() => {
          setOpenNumber(null);
          reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <section className="ui-card p-4" aria-labelledby="help-get">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <LifeBuoy className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="help-get" className="text-sm font-semibold text-heading">
              Need a hand?
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Questions about your account, Premium, or a trip — quick answers and a note to me are one tap away.
            </p>
          </div>
        </div>
        <Link href="/contact" className="btn btn-primary btn-block mt-4">
          Get help
        </Link>
      </section>

      <section aria-labelledby="help-requests">
        <h2 id="help-requests" className="font-display text-base font-bold text-heading">
          Your requests
        </h2>
        <div className="mt-3">
          {listError ? (
            <div className="ui-card p-3">
              <p className="text-sm text-text" role="status">
                {listError}
              </p>
              <button type="button" className="btn btn-secondary mt-3" onClick={reload}>
                Try again
              </button>
            </div>
          ) : requests === null ? (
            <p className="text-sm text-muted" role="status">
              Loading…
            </p>
          ) : requests.length === 0 ? (
            <EmptyState>You haven’t sent any messages yet. When you do, you can follow them here.</EmptyState>
          ) : (
            <ul className="ui-card divide-y divide-border overflow-hidden p-0">
              {requests.map((r) => (
                <li key={r.ticketNumber}>
                  <button
                    type="button"
                    onClick={() => setOpenNumber(r.ticketNumber)}
                    className="flex min-h-14 w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-surface-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-heading">{r.subject}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {r.ticketNumber} · Updated {day(r.updatedAt)}
                      </span>
                    </span>
                    <StatusPill status={r.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {emailUnconfirmed ? (
            <p className="mt-3 text-xs text-muted">
              Wrote in before signing in? Confirm your email and those messages will show here too.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function RequestDetail({ ticketNumber, onBack }: { ticketNumber: string; onBack: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/support/my-requests/${encodeURIComponent(ticketNumber)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as Partial<Detail> & { error?: string };
        if (!res.ok || !data.request) throw new Error(res.status === 404 ? "We couldn’t find that request." : data.error || "This request isn’t available right now.");
        if (alive) setDetail({ request: data.request, messages: data.messages ?? [] });
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "This request isn’t available right now.");
      }
    })();
    return () => {
      alive = false;
    };
  }, [ticketNumber]);

  async function onReply(e: FormEvent) {
    e.preventDefault();
    if (!detail || pending) return;
    setReplyError(null);
    setSent(false);
    setPending(true);
    try {
      const res = await fetch(`/api/support/my-requests/${encodeURIComponent(ticketNumber)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        request?: ReaderTicket;
        message?: ReaderTicketMessage;
      };
      if (!res.ok || !data.request || !data.message) throw new Error(data.error || "We couldn’t send your reply. Please try again.");
      setDetail({ request: data.request, messages: [...detail.messages, data.message] });
      setReply("");
      setSent(true);
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "We couldn’t send your reply. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex min-h-11 items-center gap-1 px-2 text-sm font-semibold text-accent"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Your requests
      </button>

      {error ? (
        <div className="ui-card p-3">
          <p className="text-sm text-text" role="status">
            {error}
          </p>
        </div>
      ) : !detail ? (
        <p className="text-sm text-muted" role="status">
          Loading…
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-base font-bold text-heading">{detail.request.subject}</h2>
              <p className="mt-0.5 text-xs text-muted">
                {detail.request.ticketNumber} · Sent {day(detail.request.createdAt)}
              </p>
            </div>
            <StatusPill status={detail.request.status} />
          </div>

          <ol className="space-y-3" aria-label="Conversation">
            {detail.messages.map((m) => (
              <li
                key={m.id}
                className={`rounded-xl border p-3 ${
                  m.fromReader ? "ml-6 border-accent/25 bg-accent/10" : "mr-6 border-border bg-white"
                }`}
              >
                <p className="text-xs font-semibold text-heading">
                  {m.fromReader ? "You" : m.authorName}
                  <span className="font-normal text-muted"> · {when(m.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{m.body}</p>
              </li>
            ))}
          </ol>

          <form onSubmit={onReply} className="ui-card space-y-3 p-4" aria-label="Reply">
            <label htmlFor="help-reply" className="text-sm font-semibold text-heading">
              {detail.request.status === "resolved" ? "Still need help?" : "Add a reply"}
            </label>
            {detail.request.status === "resolved" ? (
              <p className="text-xs text-muted">Send a reply and we’ll pick it back up.</p>
            ) : null}
            <textarea
              id="help-reply"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              required
              minLength={2}
              maxLength={5000}
              rows={4}
              className="w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              placeholder="Write your message…"
            />
            <button
              type="submit"
              disabled={pending || reply.trim().length < 2}
              className="btn btn-primary btn-block disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send reply"}
            </button>
            {replyError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {replyError}
              </p>
            ) : sent ? (
              <p className="text-sm text-text" role="status">
                Thanks — your reply is on its way.
              </p>
            ) : null}
          </form>
        </>
      )}
    </div>
  );
}
