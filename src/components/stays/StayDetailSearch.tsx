"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { plan } from "@/components/trip-planner/density";
import {
  stayDetailSearchPath,
  type StaysQuery,
} from "@/lib/stays";

type Props = {
  hotelId: string;
  query: StaysQuery;
  initiallyEditing?: boolean;
};

function displayDate(value: string) {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function StayDetailSearch({ hotelId, query, initiallyEditing = false }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(initiallyEditing);
  const [pending, setPending] = useState(false);
  const [startDate, setStartDate] = useState(query.startDate);
  const [endDate, setEndDate] = useState(query.endDate);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const travelers = query.adults + query.children;

  return (
    <section className="rounded-xl border border-line bg-white px-4 py-3 shadow-sm" aria-label="Hotel search">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-heading">{query.destination}</p>
          <p className="mt-0.5 text-sm text-muted">
            {displayDate(query.startDate)} – {displayDate(query.endDate)} · {travelers}{" "}
            {travelers === 1 ? "traveler" : "travelers"} · {query.rooms}{" "}
            {query.rooms === 1 ? "room" : "rooms"}
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 font-semibold text-link hover:text-accent"
          aria-expanded={editing}
          aria-controls="hotel-search-editor"
          onClick={() => setEditing((value) => !value)}
        >
          {editing ? "Close" : "Edit"}
        </button>
      </div>

      {editing ? (
        <form
          id="hotel-search-editor"
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

            const next: StaysQuery = {
              ...query,
              destination: value("dest"),
              startDate,
              endDate,
              adults: Number(value("adults")),
              children: Number(value("children")),
              rooms: Number(value("rooms")),
            };
            setPending(true);
            router.push(stayDetailSearchPath(hotelId, query, next));
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <label className="plan-stack-tight lg:col-span-2">
              <span className={plan.label}>Destination</span>
              <input
                name="dest"
                required
                defaultValue={query.destination}
                className={plan.input}
                autoComplete="off"
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-2">
              <DateRangeField
                id="hotel-detail-dates"
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
              <input name="adults" type="number" min={1} max={16} required defaultValue={query.adults} className={plan.input} />
            </label>
            <label className="plan-stack-tight">
              <span className={plan.label}>Rooms</span>
              <input name="rooms" type="number" min={1} max={8} required defaultValue={query.rooms} className={plan.input} />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="plan-stack-tight">
              <span className={plan.label}>Children</span>
              <input name="children" type="number" min={0} max={8} defaultValue={query.children} className={`${plan.input} w-24`} />
            </label>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              {pending ? "Searching…" : "Search"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
