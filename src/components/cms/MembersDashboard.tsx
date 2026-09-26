"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Download, ExternalLink, RefreshCw, Search } from "lucide-react";
import { isOptimizedAvatarSrc } from "@/lib/avatar-image";
import { formatUsd } from "@/lib/membership";
import {
  BADGE_LABEL,
  MEMBER_FILTERS,
  matchesFilter,
  matchesSearch,
  membersCsv,
  type MemberBadge,
  type MemberFilter,
  type MemberRow,
  type MembersSummary,
} from "@/lib/cms/members-shared";

type Props = {
  rows: MemberRow[];
  summary: MembersSummary;
  notices: string[];
  unavailable: string | null;
  priceNote: string;
};

const BADGE_CLASS: Record<MemberBadge, string> = {
  trial: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100",
  active: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100",
  past_due: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  canceling: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100",
  canceled: "bg-surface text-muted",
  incomplete: "bg-surface text-muted",
  paused: "bg-surface text-muted",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

function planText(plan: MemberRow["plan"]): string {
  return plan === "yearly" ? "Yearly" : plan === "monthly" ? "Monthly" : "—";
}

function initials(row: MemberRow): string {
  const source = row.name || row.email || "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function Avatar({ row }: { row: MemberRow }) {
  const src = row.image;
  if (src && (src.startsWith("/") || isOptimizedAvatarSrc(src))) {
    return (
      <Image
        src={src}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft text-xs font-semibold text-heading"
      aria-hidden="true"
    >
      {initials(row)}
    </span>
  );
}

function Badge({ badge }: { badge: MemberBadge }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[badge]}`}
    >
      {BADGE_LABEL[badge]}
    </span>
  );
}

function StatCard({
  label,
  value,
  note,
  className = "",
}: {
  label: string;
  value: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={`panel p-4 sm:p-5 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="font-display mt-2 text-3xl font-bold text-heading">{value}</p>
      {note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
    </div>
  );
}

export function MembersDashboard({ rows: initialRows, summary, notices, unavailable, priceNote }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ userId: string; ok: boolean; text: string } | null>(null);

  const counts = useMemo(() => {
    const out = {} as Record<MemberFilter, number>;
    for (const f of MEMBER_FILTERS) out[f.id] = rows.filter((r) => matchesFilter(r, f.id)).length;
    return out;
  }, [rows]);

  const visible = useMemo(
    () => rows.filter((r) => matchesFilter(r, filter) && matchesSearch(r, query)),
    [rows, filter, query],
  );

  async function refresh(userId: string) {
    setBusy(userId);
    setFeedback(null);
    try {
      const res = await fetch("/api/cms/members/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = (await res.json()) as { member?: MemberRow; error?: string };
      if (!res.ok || !data.member) {
        setFeedback({ userId, ok: false, text: data.error || "Couldn’t refresh." });
        return;
      }
      const member = data.member;
      setRows((prev) => prev.map((r) => (r.userId === userId ? member : r)));
      setFeedback({ userId, ok: true, text: "Updated from Stripe." });
    } catch {
      setFeedback({ userId, ok: false, text: "Couldn’t refresh." });
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const blob = new Blob([membersCsv(visible)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function rowFeedback(row: MemberRow) {
    if (feedback?.userId !== row.userId) return null;
    return (
      <p className={`text-xs ${feedback.ok ? "text-steel" : "text-red-700 dark:text-red-300"}`} role="status">
        {feedback.text}
      </p>
    );
  }

  function actions(row: MemberRow) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {row.stripeUrl ? (
          <a
            href={row.stripeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-heading transition hover:bg-surface-soft"
          >
            View in Stripe
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
        {row.canRefresh ? (
          <button
            type="button"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-semibold text-heading transition hover:bg-surface-soft disabled:opacity-60"
            disabled={busy !== null}
            onClick={() => void refresh(row.userId)}
            aria-label={`Refresh ${row.email || "member"} from Stripe`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy === row.userId ? "animate-spin" : ""}`} aria-hidden />
            Refresh
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-accent">Premium</p>
          <h1 className="font-display mt-2 text-display text-heading">Members</h1>
          <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
            Readers with a Premium subscription. Status comes from Stripe through the
            webhook; use Refresh if a member looks out of date.
          </p>
        </div>
        {rows.length > 0 ? (
          <button type="button" className="btn btn-secondary shrink-0" onClick={exportCsv}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </button>
        ) : null}
      </div>

      {unavailable ? (
        <div className="panel p-6">
          <p className="text-sm text-text" role="status">
            {unavailable}
          </p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5" aria-label="Summary">
            <StatCard label="Active members" value={String(summary.activeTotal)} note="Active and in trial" />
            <StatCard label="In trial" value={String(summary.trialing)} />
            <StatCard label="Past due" value={String(summary.pastDue)} />
            <StatCard label="Canceling" value={String(summary.canceling)} note="Ends at period end" />
            <StatCard
              className="col-span-2 lg:col-span-1"
              label="MRR (estimated)"
              value={formatUsd(summary.mrrCents)}
              note={`${formatUsd(summary.mrrWithTrialsCents)} once trials convert · ${priceNote}`}
            />
          </section>

          {notices.length > 0 ? (
            <ul className="space-y-1 rounded-xl border border-border bg-surface-soft p-4 text-sm text-text">
              {notices.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          ) : null}

          {rows.length === 0 ? (
            <div className="panel p-8 text-center">
              <p className="font-display text-lg font-bold text-heading">No members yet</p>
              <p className="mt-2 text-sm text-muted">
                When a reader subscribes on /premium, they’ll show up here.
              </p>
            </div>
          ) : (
            <section className="space-y-4" aria-label="Members">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filter members">
                  {MEMBER_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition ${
                        filter === f.id
                          ? "border-transparent bg-ink text-on-solid"
                          : "border-border bg-white text-text hover:bg-surface-soft"
                      }`}
                    >
                      {f.label}
                      <span className={filter === f.id ? "text-on-solid/70" : "text-muted"}>{counts[f.id]}</span>
                    </button>
                  ))}
                </div>
                <label className="relative block w-full lg:w-72">
                  <span className="sr-only">Search members</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name or email"
                    className="h-10 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-sm text-heading placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              {visible.length === 0 ? (
                <div className="panel p-6 text-sm text-muted">No members match.</div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="panel hidden overflow-x-auto md:block">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border bg-surface-soft text-xs font-semibold uppercase tracking-wide text-muted">
                          <th scope="col" className="px-4 py-3">Member</th>
                          <th scope="col" className="px-3 py-3">Plan</th>
                          <th scope="col" className="px-3 py-3">Status</th>
                          <th scope="col" className="px-3 py-3">Member since</th>
                          <th scope="col" className="px-3 py-3">Next</th>
                          <th scope="col" className="px-4 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {visible.map((row) => (
                          <tr key={row.userId} className="border-b border-border align-middle last:border-b-0">
                            <td className="px-4 py-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar row={row} />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-heading">{row.name || "—"}</p>
                                  <p className="truncate text-xs text-muted">{row.email || "No email"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-text">{planText(row.plan)}</td>
                            <td className="px-3 py-3">
                              <Badge badge={row.badge} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-text">{formatDate(row.memberSince)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-text">
                              {row.nextDate ? (
                                <>
                                  <span className="block text-xs text-muted">{row.nextDateLabel}</span>
                                  {formatDate(row.nextDate)}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col items-end gap-1">
                                {actions(row)}
                                {rowFeedback(row)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Phone cards */}
                  <ul className="space-y-3 md:hidden">
                    {visible.map((row) => (
                      <li key={row.userId} className="panel p-4">
                        <div className="flex items-start gap-3">
                          <Avatar row={row} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate font-semibold text-heading">{row.name || "—"}</p>
                              <Badge badge={row.badge} />
                            </div>
                            <p className="truncate text-xs text-muted">{row.email || "No email"}</p>
                          </div>
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <dt className="text-muted">Plan</dt>
                            <dd className="mt-0.5 font-semibold text-heading">{planText(row.plan)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted">Since</dt>
                            <dd className="mt-0.5 font-semibold text-heading">{formatDate(row.memberSince)}</dd>
                          </div>
                          <div>
                            <dt className="text-muted">{row.nextDateLabel ?? "Next"}</dt>
                            <dd className="mt-0.5 font-semibold text-heading">{formatDate(row.nextDate)}</dd>
                          </div>
                        </dl>
                        <div className="mt-3 space-y-1">
                          {actions(row)}
                          {rowFeedback(row)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
