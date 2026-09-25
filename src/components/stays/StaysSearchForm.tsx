"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { plan } from "@/components/trip-planner/density";
import { staysPath, type StaysQuery } from "@/lib/stays";

type Props = {
  query: StaysQuery;
  /** Collapse the editor behind a summary once results are on screen. */
  startCollapsed?: boolean;
};

function summaryDate(value: string): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function summaryWhen(startDate: string, endDate: string): string {
  const start = summaryDate(startDate);
  const end = summaryDate(endDate);
  if (!start || !end) return "Add dates";
  const month = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
  const sameMonth =
    start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth();
  if (sameMonth) return `${month.format(start)} ${start.getUTCDate()}–${end.getUTCDate()}`;
  return `${month.format(start)} ${start.getUTCDate()} – ${month.format(end)} ${end.getUTCDate()}`;
}

export function StaysSearchForm({ query, startCollapsed = false }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(!startCollapsed);
  const [startDate, setStartDate] = useState(query.startDate);
  const [endDate, setEndDate] = useState(query.endDate);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const travelers = query.adults + query.children;
  const when = summaryWhen(query.startDate, query.endDate);

  return (
    <div className="rounded-xl border border-line bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-border bg-surface-soft px-3 py-1.5 text-left"
          aria-expanded={editing}
          aria-controls="stays-search-editor"
          onClick={() => setEditing((value) => !value)}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-on-solid" aria-hidden="true">
            <Search className="h-4 w-4" strokeWidth={2.4} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-heading">{query.destination}</span>
            <span className="block truncate text-xs text-muted">
              {when} · {travelers} {travelers === 1 ? "traveler" : "travelers"}
              {query.rooms > 1 ? ` · ${query.rooms} rooms` : ""}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-semibold text-link"
          aria-expanded={editing}
          aria-controls="stays-search-editor"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>
    <form
      id="stays-search-editor"
      hidden={!editing}
      className="mt-4 border-t border-line pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (key: string) => String(data.get(key) ?? "");
        const startIssue = startDate ? "" : "Add a check-in date.";
        const endIssue = !endDate
          ? "Add a check-out date."
          : endDate <= startDate
            ? "Check-out has to be after check-in."
            : "";
        setStartError(startIssue);
        setEndError(endIssue);
        if (startIssue || endIssue) return;
        setPending(true);
        router.push(
          staysPath({
            destination: value("dest"),
            startDate,
            endDate,
            adults: value("adults"),
            children: value("children"),
            rooms: value("rooms"),
            sessionId: query.sessionId,
            tripId: query.tripId,
            filters: query.filters,
          }),
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,2fr)_minmax(18rem,2fr)_minmax(6rem,.65fr)_minmax(6rem,.65fr)] lg:items-end">
        <label className="plan-stack-tight">
          <span className={plan.label}>Destination</span>
          <input
            name="dest"
            required
            defaultValue={query.destination}
            placeholder="Paris"
            className={plan.input}
            autoComplete="off"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-1">
          <DateRangeField
            id="stays-dates"
            startDate={startDate}
            endDate={endDate}
            startLabel="Check-in"
            endLabel="Check-out"
            dialogLabel="Stay dates"
            allowSameDay={false}
            startError={startError}
            endError={endError}
            onChange={(next) => {
              setStartDate(next.startDate);
              setEndDate(next.endDate);
              setStartError("");
              setEndError("");
            }}
          />
        </div>
        <label className="plan-stack-tight">
          <span className={plan.label}>Adults</span>
          <input
            name="adults"
            type="number"
            min={1}
            max={16}
            required
            defaultValue={query.adults}
            className={plan.input}
          />
        </label>
        <label className="plan-stack-tight">
          <span className={plan.label}>Rooms</span>
          <input
            name="rooms"
            type="number"
            min={1}
            max={8}
            required
            defaultValue={query.rooms}
            className={plan.input}
          />
        </label>
      </div>
      <label className={`${plan.label} mt-3 flex items-center gap-2 lg:ml-auto lg:w-fit`}>
        Children
        <input
          name="children"
          type="number"
          min={0}
          max={8}
          defaultValue={query.children}
          className={`${plan.input} w-20`}
          aria-label="Children"
        />
      </label>
      <div className="plan-actions plan-sticky plan-sticky-page plan-sticky-solo">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
    </div>
  );
}
