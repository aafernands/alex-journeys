"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { plan } from "@/components/trip-planner/density";
import { staysPath, type StaysQuery } from "@/lib/stays";

type Props = {
  query: StaysQuery;
};

export function StaysSearchForm({ query }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [startDate, setStartDate] = useState(query.startDate);
  const [endDate, setEndDate] = useState(query.endDate);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");

  return (
    <form
      className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5"
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
  );
}
