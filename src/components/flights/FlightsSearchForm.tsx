"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { plan } from "@/components/trip-planner/density";
import {
  FLIGHT_CABIN_LABEL,
  FLIGHT_CABINS,
  flightsPath,
  type FlightCabin,
  type FlightsQuery,
  type FlightTripType,
} from "@/lib/flights";

type Props = {
  query: FlightsQuery;
};

export function FlightsSearchForm({ query }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [tripType, setTripType] = useState<FlightTripType>(query.tripType);
  const [startDate, setStartDate] = useState(query.startDate);
  const [endDate, setEndDate] = useState(query.endDate);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const [cabin, setCabin] = useState<FlightCabin>(query.cabin);

  return (
    <form
      id="flights-search"
      className="panel plan-inset plan-stack"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const value = (key: string) => String(data.get(key) ?? "");
        const startIssue = startDate ? "" : "Add a departure date.";
        const endIssue =
          tripType === "oneway"
            ? ""
            : !endDate
              ? "Add a return date."
              : endDate < startDate
                ? "Return has to be on or after departure."
                : "";
        setStartError(startIssue);
        setEndError(endIssue);
        if (startIssue || endIssue) return;
        setPending(true);
        router.push(
          flightsPath({
            origin: value("origin"),
            destination: value("dest"),
            startDate,
            endDate: tripType === "roundtrip" ? endDate : "",
            tripType,
            adults: value("adults"),
            children: value("children"),
            cabin,
            tripId: query.tripId,
          }),
        );
      }}
    >
      <div className="flex flex-wrap gap-2" role="group" aria-label="Trip type">
        {(
          [
            ["roundtrip", "Round-trip"],
            ["oneway", "One-way"],
          ] as const
        ).map(([value, label]) => {
          const pressed = tripType === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={pressed}
              className={`${plan.chip} ${
                pressed
                  ? "border-ink bg-ink text-on-solid"
                  : "border-border bg-white text-text hover:border-border-strong"
              }`}
              onClick={() => setTripType(value)}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted">
        A city uses its main airport. Type another three-letter code to override it.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="plan-stack-tight lg:col-span-2">
          <span className={plan.label}>From</span>
          <input
            name="origin"
            required
            defaultValue={query.origin}
            placeholder="City or airport"
            className={plan.input}
            autoComplete="off"
          />
        </label>
        <label className="plan-stack-tight lg:col-span-2">
          <span className={plan.label}>To</span>
          <input
            name="dest"
            required
            defaultValue={query.destination}
            placeholder="City or airport"
            className={plan.input}
            autoComplete="off"
          />
        </label>
        <label className="plan-stack-tight">
          <span className={plan.label}>Adults</span>
          <input
            name="adults"
            type="number"
            min={1}
            max={9}
            required
            defaultValue={query.adults}
            className={plan.input}
          />
        </label>
        <label className="plan-stack-tight">
          <span className={plan.label}>Children</span>
          <input
            name="children"
            type="number"
            min={0}
            max={8}
            defaultValue={query.children}
            className={plan.input}
            aria-label="Children"
          />
        </label>
      </div>
      {tripType === "roundtrip" ? (
        <DateRangeField
          id="flights-dates"
          startDate={startDate}
          endDate={endDate}
          startLabel="Depart"
          endLabel="Return"
          dialogLabel="Flight dates"
          allowSameDay
          startError={startError}
          endError={endError}
          onChange={(next) => {
            setStartDate(next.startDate);
            setEndDate(next.endDate);
            setStartError("");
            setEndError("");
          }}
        />
      ) : (
        <label className="plan-stack-tight max-w-xs">
          <span className={plan.label}>Depart</span>
          <input
            type="date"
            required
            value={startDate}
            className={plan.input}
            aria-invalid={Boolean(startError)}
            onChange={(event) => {
              setStartDate(event.target.value);
              setStartError("");
            }}
          />
          {startError ? <span className="text-sm font-semibold text-link">{startError}</span> : null}
        </label>
      )}
      <label className="plan-stack-tight max-w-xs">
        <span className={plan.label}>Cabin</span>
        <select
          name="cabin"
          className={plan.input}
          value={cabin}
          onChange={(event) => setCabin(event.target.value as FlightCabin)}
        >
          {FLIGHT_CABINS.map((value) => (
            <option key={value} value={value}>
              {FLIGHT_CABIN_LABEL[value]}
            </option>
          ))}
        </select>
      </label>
      <div className="plan-actions plan-sticky plan-sticky-page plan-sticky-solo">
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Searching…" : "Search flights"}
        </button>
      </div>
    </form>
  );
}
