import Link from "next/link";
import { redirect } from "next/navigation";
import { TicketStatusBadge } from "@/components/cms/support/TicketStatusBadge";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { listTickets, SupportUnavailableError, ticketCounts } from "@/lib/support-store";
import {
  isTicketStatus,
  TICKET_STATUS_LABELS,
  type SupportTicket,
  type TicketStatus,
} from "@/lib/support-tickets";

export const dynamic = "force-dynamic";

type Filter = TicketStatus | "active" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "active", label: "Needs attention" },
  { id: "open", label: TICKET_STATUS_LABELS.open },
  { id: "in_progress", label: TICKET_STATUS_LABELS.in_progress },
  { id: "waiting", label: TICKET_STATUS_LABELS.waiting },
  { id: "closed", label: TICKET_STATUS_LABELS.closed },
  { id: "all", label: "All" },
];

function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" });
}

export default async function CmsSupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  if (!(await isCmsAuthenticated())) redirect("/cms");
  const params = await searchParams;
  const raw = params.status ?? "active";
  const filter: Filter = raw === "all" || raw === "active" || isTicketStatus(raw) ? raw : "active";
  const query = (params.q ?? "").slice(0, 100);

  let tickets: SupportTicket[] = [];
  let counts: Awaited<ReturnType<typeof ticketCounts>> | null = null;
  let loadError: string | null = null;
  try {
    [tickets, counts] = await Promise.all([listTickets({ status: filter, query }), ticketCounts()]);
  } catch (err) {
    loadError =
      err instanceof SupportUnavailableError
        ? "Firestore is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
        : "Could not load support requests.";
    if (!(err instanceof SupportUnavailableError)) console.error("[cms/support] list failed:", err);
  }

  function countFor(id: Filter): number | null {
    if (!counts) return null;
    if (id === "all") return counts.open + counts.in_progress + counts.waiting + counts.closed;
    if (id === "active") return counts.open + counts.in_progress + counts.waiting;
    return counts[id];
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow text-accent">Readers</p>
        <h1 className="font-display mt-2 text-display text-heading">Support</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          Messages from the Help &amp; Contact page. Replies you send here go to the reader by
          email, and their email replies land back on the same request.
          {counts?.unread ? ` ${counts.unread} unread.` : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filter by status">
        {FILTERS.map((f) => {
          const active = f.id === filter;
          const n = countFor(f.id);
          const href = `/cms/support?status=${f.id}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
          return (
            <Link
              key={f.id}
              href={href}
              role="tab"
              aria-selected={active}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                active ? "border-accent bg-accent text-white" : "border-border bg-white text-heading hover:border-accent"
              }`}
            >
              {f.label}
              {n !== null ? <span className={active ? "ml-1.5 opacity-90" : "ml-1.5 text-muted"}>{n}</span> : null}
            </Link>
          );
        })}
        <form className="ml-auto flex gap-2" action="/cms/support">
          <input type="hidden" name="status" value={filter} />
          <input
            name="q"
            defaultValue={query}
            placeholder="Search number, name, email…"
            aria-label="Search support requests"
            className="min-h-10 w-64 rounded-lg border border-border bg-white px-3 text-sm text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
          <button type="submit" className="btn btn-secondary text-sm">
            Search
          </button>
        </form>
      </div>

      {loadError ? (
        <div className="panel p-6">
          <p className="text-sm text-text" role="status">
            {loadError}
          </p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm text-text">No requests here.</p>
        </div>
      ) : (
        <ul className="panel divide-y divide-border p-0">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/cms/support/${encodeURIComponent(t.ticketNumber)}`}
                className="flex flex-col gap-1 px-4 py-3 transition hover:bg-surface-soft md:flex-row md:items-center md:gap-4"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-2">
                    {t.unreadForStaff ? (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />
                    ) : null}
                    <span className={`truncate text-sm ${t.unreadForStaff ? "font-bold" : "font-semibold"} text-heading`}>
                      {t.subject}
                    </span>
                  </span>
                  <span className="truncate text-sm text-muted">
                    {t.name} · {t.email} · {t.lastMessagePreview}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-muted">
                  <span className="font-mono">{t.ticketNumber}</span>
                  <TicketStatusBadge status={t.status} />
                  <span>{when(t.lastMessageAt)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
