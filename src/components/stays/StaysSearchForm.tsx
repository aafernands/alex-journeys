"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { ListRow } from "@/components/ui/ListRow";
import { staysPath, type StaysQuery } from "@/lib/stays";

type Props = {
  query: StaysQuery;
  /** Collapse the editor behind a summary once results are on screen. */
  startCollapsed?: boolean;
  backHref?: string;
  backLabel?: string;
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

export function StaysSearchForm({
  query,
  startCollapsed = false,
  backHref = "",
  backLabel = "",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(!startCollapsed);
  const [startDate, setStartDate] = useState(query.startDate);
  const [endDate, setEndDate] = useState(query.endDate);
  const [startError, setStartError] = useState("");
  const [endError, setEndError] = useState("");
  const travelers = query.adults + query.children;
  const when = summaryWhen(query.startDate, query.endDate);
  const detail = [
    when,
    `${travelers} ${travelers === 1 ? "traveler" : "travelers"}`,
    query.rooms > 1 ? `${query.rooms} rooms` : "",
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
          title={query.destination}
          detail={detail}
          onClick={() => setEditing((value) => !value)}
          expanded={editing}
          trailing={
            <Button
              variant="ghost"
              aria-expanded={editing}
              aria-controls="stays-search-editor"
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? "Close" : "Edit"}
            </Button>
          }
        />
        <form
          id="stays-search-editor"
          hidden={!editing}
          className="mt-2 border-t border-border pt-3"
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
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Destination" htmlFor="stays-dest">
              <Input
                id="stays-dest"
                name="dest"
                required
                defaultValue={query.destination}
                placeholder="Paris"
                autoComplete="off"
              />
            </Field>
            <div className="sm:col-span-2">
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
            <Field label="Adults" htmlFor="stays-adults">
              <Input
                id="stays-adults"
                name="adults"
                type="number"
                min={1}
                max={16}
                required
                defaultValue={query.adults}
              />
            </Field>
            <Field label="Rooms" htmlFor="stays-rooms">
              <Input
                id="stays-rooms"
                name="rooms"
                type="number"
                min={1}
                max={8}
                required
                defaultValue={query.rooms}
              />
            </Field>
            <Field label="Children" htmlFor="stays-children">
              <Input
                id="stays-children"
                name="children"
                type="number"
                min={0}
                max={8}
                defaultValue={query.children}
              />
            </Field>
          </div>
          <Button type="submit" className="mt-3 w-full" disabled={pending}>
            {pending ? "Searching…" : "Search"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
