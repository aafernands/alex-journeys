"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { plan } from "@/components/trip-planner/density";
import { staysPath, type StaysQuery } from "@/lib/stays";

type Props = {
  query: StaysQuery;
};

export function StaysSearchForm({ query }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="panel plan-inset plan-stack"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (key: string) => String(data.get(key) ?? "");
        setPending(true);
        router.push(
          staysPath({
            destination: value("dest"),
            startDate: value("start"),
            endDate: value("end"),
            adults: value("adults"),
            children: value("children"),
            rooms: value("rooms"),
            sessionId: query.sessionId,
          }),
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="plan-stack-tight lg:col-span-2">
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
        <label className="plan-stack-tight">
          <span className={plan.label}>Check-in</span>
          <input
            name="start"
            type="date"
            required
            defaultValue={query.startDate}
            className={plan.input}
          />
        </label>
        <label className="plan-stack-tight">
          <span className={plan.label}>Check-out</span>
          <input
            name="end"
            type="date"
            required
            defaultValue={query.endDate}
            className={plan.input}
          />
        </label>
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
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Searching…" : "Search stays"}
        </button>
        <label className={`${plan.label} flex items-center gap-2`}>
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
      </div>
    </form>
  );
}
