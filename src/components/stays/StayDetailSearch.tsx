"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Input";
import { ListRow } from "@/components/ui/ListRow";
import { stayDetailSearchPath, type StaysQuery } from "@/lib/stays";

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
  const when =
    query.startDate && query.endDate
      ? `${displayDate(query.startDate)} – ${displayDate(query.endDate)}`
      : "Add dates";
  const detail = [
    when,
    `${travelers} ${travelers === 1 ? "traveler" : "travelers"}`,
    `${query.rooms} ${query.rooms === 1 ? "room" : "rooms"}`,
  ].join(" · ");

  return (
    <Card density="compact">
      <ListRow
        leading={<Search size={18} aria-hidden="true" />}
        title={query.destination || "This hotel"}
        detail={detail}
        onClick={() => setEditing((value) => !value)}
        expanded={editing}
        trailing={
          <Button
            variant="ghost"
            aria-expanded={editing}
            aria-controls="hotel-search-editor"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? "Close" : "Edit"}
          </Button>
        }
      />
      <form
        id="hotel-search-editor"
        hidden={!editing}
        className="mt-2 border-t border-border pt-3"
        aria-label="Hotel search"
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
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Destination" htmlFor="hotel-dest">
            <Input
              id="hotel-dest"
              name="dest"
              required
              defaultValue={query.destination}
              autoComplete="off"
            />
          </Field>
          <div className="sm:col-span-2">
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
          <Field label="Adults" htmlFor="hotel-adults">
            <Input id="hotel-adults" name="adults" type="number" min={1} max={16} required defaultValue={query.adults} />
          </Field>
          <Field label="Rooms" htmlFor="hotel-rooms">
            <Input id="hotel-rooms" name="rooms" type="number" min={1} max={8} required defaultValue={query.rooms} />
          </Field>
          <Field label="Children" htmlFor="hotel-children">
            <Input id="hotel-children" name="children" type="number" min={0} max={8} defaultValue={query.children} />
          </Field>
        </div>
        <Button type="submit" className="mt-3 w-full" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
      </form>
    </Card>
  );
}
