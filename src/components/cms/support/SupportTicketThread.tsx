"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUSES,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
} from "@/lib/support-tickets";

type Props = {
  ticket: SupportTicket;
  messages: TicketMessage[];
  emailConfigured: boolean;
};

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

const CHANNEL: Record<TicketMessage["channel"], string> = {
  form: "Contact form",
  email: "Email reply",
  cms: "Sent from CMS",
  site: "Reply from the website",
};

export function SupportTicketThread({ ticket, messages, emailConfigured }: Props) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState<null | "reply" | "reply-close" | TicketStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [notifyOnClose, setNotifyOnClose] = useState(true);

  async function sendReply(close: boolean) {
    setError(null);
    setInfo(null);
    setPending(close ? "reply-close" : "reply");
    try {
      const res = await fetch(`/api/cms/support/${encodeURIComponent(ticket.ticketNumber)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, close }),
      });
      const data = (await res.json()) as { error?: string; emailStatus?: string };
      if (!res.ok) {
        setError(data.error || "Could not send reply.");
      } else {
        setReply("");
        setInfo(
          data.emailStatus === "sent"
            ? `Reply sent to ${ticket.email}.`
            : data.emailStatus === "skipped"
              ? "Reply saved. Email sending is off, so the reader was not emailed."
              : "Reply saved, but the email didn’t go out. Try again or email the reader directly.",
        );
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    }
    setPending(null);
  }

  async function changeStatus(status: TicketStatus) {
    setError(null);
    setInfo(null);
    setPending(status);
    try {
      const res = await fetch(`/api/cms/support/${encodeURIComponent(ticket.ticketNumber)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notify: status === "closed" && notifyOnClose }),
      });
      const data = (await res.json()) as { error?: string; emailStatus?: string | null };
      if (!res.ok) setError(data.error || "Could not update.");
      else {
        setInfo(
          status === "closed" && data.emailStatus === "sent"
            ? `Closed. We emailed ${ticket.email}.`
            : `Marked as ${TICKET_STATUS_LABELS[status].toLowerCase()}.`,
        );
        router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    }
    setPending(null);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="space-y-4">
        <div>
          <p className="font-mono text-xs text-muted">{ticket.ticketNumber}</p>
          <h1 className="font-display mt-1 text-2xl font-bold text-heading">{ticket.subject}</h1>
        </div>

        <ol className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`panel p-4 ${m.direction === "staff" ? "border-l-4 border-l-accent bg-surface-soft" : ""}`}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted">
                <span className="text-sm font-semibold text-heading">
                  {m.direction === "staff" ? `${m.authorName ?? "Alex Journeys"} (you)` : m.authorName || ticket.name}
                </span>
                <span>
                  {CHANNEL[m.channel]} · {when(m.createdAt)}
                  {m.direction === "staff" && m.emailStatus && m.emailStatus !== "sent"
                    ? ` · email ${m.emailStatus === "skipped" ? "not sent (sending off)" : "failed"}`
                    : ""}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{m.body}</p>
            </li>
          ))}
        </ol>

        <div className="panel p-4">
          <label htmlFor="support-reply" className="block text-sm font-semibold text-heading">
            Reply to {ticket.name || ticket.email}
          </label>
          <textarea
            id="support-reply"
            rows={7}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Hi ${ticket.name.split(/\s+/)[0] || "there"},`}
            className="mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          {!emailConfigured ? (
            <p className="mt-2 text-xs text-muted">
              Email sending is off (no Resend key), so replies are saved but not emailed.
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!reply.trim() || pending !== null}
              onClick={() => sendReply(false)}
              className="btn btn-primary disabled:opacity-60"
            >
              {pending === "reply" ? "Sending…" : "Send reply"}
            </button>
            <button
              type="button"
              disabled={!reply.trim() || pending !== null}
              onClick={() => sendReply(true)}
              className="btn btn-secondary disabled:opacity-60"
            >
              {pending === "reply-close" ? "Sending…" : "Send and close"}
            </button>
          </div>
          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          {info ? (
            <p className="mt-3 text-sm text-text" role="status">
              {info}
            </p>
          ) : null}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="panel p-4 text-sm">
          <h2 className="font-semibold text-heading">Reader</h2>
          <p className="mt-2 text-text">{ticket.name}</p>
          <a href={`mailto:${ticket.email}`} className="break-all text-accent hover:text-accent-deep">
            {ticket.email}
          </a>
          <p className="mt-1 text-muted">{ticket.userId ? "Signed-in reader" : "Guest"}</p>
          <dl className="mt-3 space-y-1 text-muted">
            <div>
              <dt className="inline">Topic: </dt>
              <dd className="inline text-text">{ticket.topic}</dd>
            </div>
            <div>
              <dt className="inline">Opened: </dt>
              <dd className="inline text-text">{when(ticket.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="panel p-4 text-sm">
          <h2 className="font-semibold text-heading">Status</h2>
          <p className="mt-1 text-text">{TICKET_STATUS_LABELS[ticket.status]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TICKET_STATUSES.filter((s) => s !== ticket.status).map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending !== null}
                onClick={() => changeStatus(s)}
                className={`btn text-xs disabled:opacity-60 ${s === "closed" ? "btn-primary" : "btn-secondary"}`}
              >
                {pending === s ? "Saving…" : s === "closed" ? "Close request" : s === "open" && ticket.status === "closed" ? "Reopen" : TICKET_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {ticket.status !== "closed" ? (
            <label className="mt-3 flex items-center gap-2 text-xs text-muted">
              <input
                type="checkbox"
                checked={notifyOnClose}
                onChange={(e) => setNotifyOnClose(e.target.checked)}
              />
              Email the reader when I close it
            </label>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
