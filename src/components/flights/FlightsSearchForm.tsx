"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Field, Input, Select } from "@/components/ui/Input";
import { ListRow } from "@/components/ui/ListRow";
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
  startCollapsed?: boolean;
  backHref?: string;
  backLabel?: string;
};

function summaryDate(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function FlightsSearchForm({
  query,
  startCollapsed = false,
  backHref = "",
  backLabel = "",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(!startCollapsed);
  const [tripType, setTripType] = useState<FlightTripType>(query.tripType);
  const [startDate, setStartDate] = useState(query.startDate);
  const [endDate, setEndDate] = useState(query.endDate);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const [cabin, setCabin] = useState<FlightCabin>(query.cabin);
  const route =
    query.origin && query.destination
      ? `${query.origin} → ${query.destination}`
      : query.origin || query.destination || "Search flights";
  const when =
    tripType === "oneway" || !query.endDate
      ? summaryDate(query.startDate) || "Add dates"
      : [summaryDate(query.startDate), summaryDate(query.endDate)].filter(Boolean).join(" – ") ||
        "Add dates";
  const people = query.adults + query.children;
  const detail = [
    when,
    `${people} ${people === 1 ? "traveler" : "travelers"}`,
    FLIGHT_CABIN_LABEL[query.cabin],
    tripType === "oneway" ? "One-way" : "Round-trip",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      {backHref && backLabel ? (
        <Link href={backHref} className="ui-row-action">
          {backLabel}
        </Link>
      ) : null}
      <Card density="compact">
        <ListRow
          leading={<Search size={18} aria-hidden="true" />}
          title={route}
          detail={detail}
          onClick={() => setEditing((value) => !value)}
          expanded={editing}
          trailing={
            <Button
              variant="ghost"
              aria-expanded={editing}
              aria-controls="flights-search"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "Close" : "Edit"}
            </Button>
          }
        />
        <form
          id="flights-search"
          hidden={!editing}
          className="mt-2 flex flex-col gap-2 border-t border-border pt-3"
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
            ).map(([value, label]) => (
              <Chip
                key={value}
                selected={tripType === value}
                aria-pressed={tripType === value}
                onClick={() => setTripType(value)}
              >
                {label}
              </Chip>
            ))}
          </div>
          <p className="ui-field-hint">
            A city uses its main airport. Type another three-letter code to override it.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="From" htmlFor="flight-origin">
              <Input
                id="flight-origin"
                name="origin"
                required
                defaultValue={query.origin}
                placeholder="City or airport"
                autoComplete="off"
              />
            </Field>
            <Field label="To" htmlFor="flight-dest">
              <Input
                id="flight-dest"
                name="dest"
                required
                defaultValue={query.destination}
                placeholder="City or airport"
                autoComplete="off"
              />
            </Field>
            <Field label="Adults" htmlFor="flight-adults">
              <Input
                id="flight-adults"
                name="adults"
                type="number"
                min={1}
                max={9}
                required
                defaultValue={query.adults}
              />
            </Field>
            <Field label="Children" htmlFor="flight-children">
              <Input
                id="flight-children"
                name="children"
                type="number"
                min={0}
                max={8}
                defaultValue={query.children}
              />
            </Field>
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
            <Field label="Depart" htmlFor="flight-depart" error={startError}>
              <Input
                id="flight-depart"
                type="date"
                required
                value={startDate}
                aria-invalid={Boolean(startError)}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  setStartError("");
                }}
              />
            </Field>
          )}
          <Field label="Cabin" htmlFor="flight-cabin">
            <Select
              id="flight-cabin"
              name="cabin"
              value={cabin}
              onChange={(event) => setCabin(event.target.value as FlightCabin)}
            >
              {FLIGHT_CABINS.map((value) => (
                <option key={value} value={value}>
                  {FLIGHT_CABIN_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Searching…" : "Search flights"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
