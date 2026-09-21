"use client";

import { useState, type DragEvent } from "react";
import {
  compareScheduledItems,
  formatTripWeekRange,
  scheduledDayIndex,
  TRIP_STATUS_LABEL,
  TRIP_WEEKDAYS,
  tripWeeks,
  type TripDay,
  type TripItem,
} from "@/lib/trip-record";

type Props = {
  headingId: string;
  days: TripDay[];
  items: TripItem[];
  onAssignDay: (id: string, dayIndex: number | null) => void;
  onEdit: (id: string) => void;
};

const daySelectClass =
  "mt-1.5 min-h-8 w-full rounded-md border border-border bg-white px-1.5 py-1 text-xs text-heading focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

function itemsForDay(items: TripItem[], dayIndex: number, dayCount: number): TripItem[] {
  return items
    .filter((item) => scheduledDayIndex(item, dayCount) === dayIndex)
    .sort(compareScheduledItems);
}

function WeekChip({
  item,
  days,
  dragging,
  onAssignDay,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  item: TripItem;
  days: TripDay[];
  dragging: boolean;
  onAssignDay: (id: string, dayIndex: number | null) => void;
  onEdit: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const dayIndex = scheduledDayIndex(item, days.length);
  return (
    <article
      className={`rounded-lg border px-2 py-1.5 ${
        item.status === "booked"
          ? "border-accent/30 bg-accent/10"
          : item.status === "skipped"
            ? "border-border bg-surface-soft"
            : "border-border bg-white"
      } ${dragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-1">
        <p className="min-w-0 font-display text-xs font-bold leading-snug text-heading">
          {item.time ? (
            <span className="mr-1 text-accent">{item.time}</span>
          ) : null}
          {item.title}
        </p>
        <button
          type="button"
          draggable
          aria-label={`Drag ${item.title} to a day`}
          title="Drag to a day"
          className="shrink-0 cursor-grab rounded px-1 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted active:cursor-grabbing"
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", item.id);
            event.dataTransfer.effectAllowed = "move";
            const card = event.currentTarget.closest("article");
            if (card) event.dataTransfer.setDragImage(card, 16, 16);
            onDragStart(item.id);
          }}
          onDragEnd={onDragEnd}
        >
          Move
        </button>
      </div>
      <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-muted">
        {TRIP_STATUS_LABEL[item.status]}
      </p>
      <select
        id={`week-day-${item.id}`}
        className={daySelectClass}
        aria-label={`Day for ${item.title}`}
        value={dayIndex == null ? "" : String(dayIndex)}
        onChange={(event) => {
          const next = event.target.value;
          onAssignDay(item.id, next ? Number(next) : null);
        }}
      >
        <option value="">Unscheduled</option>
        {days.map((day) => (
          <option key={day.index} value={day.index}>
            {day.label}
            {day.detail ? ` · ${day.detail}` : ""}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="mt-1 text-xs font-semibold text-accent hover:underline"
        onClick={() => onEdit(item.id)}
      >
        Edit
      </button>
    </article>
  );
}

export function WeekView({ headingId, days, items, onAssignDay, onEdit }: Props) {
  const weeks = tripWeeks(days);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const unscheduled = items
    .filter((item) => scheduledDayIndex(item, days.length) == null)
    .sort(compareScheduledItems);

  function allowDrop(event: DragEvent, key: string) {
    if (!draggingId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overKey !== key) setOverKey(key);
  }

  function dropOn(event: DragEvent, dayIndex: number | null) {
    event.preventDefault();
    const id = draggingId || event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setOverKey(null);
    if (!id) return;
    onAssignDay(id, dayIndex);
  }

  function endDrag() {
    setDraggingId(null);
    setOverKey(null);
  }

  return (
    <div className="mt-4 space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        Drag a booking onto a day, or choose a day on the booking. Time stays on the
        booking when you move it.
      </p>
      <div className="overflow-x-auto pb-1">
        <div className="min-w-[52rem]" aria-label="Trip week">
          <div className="grid grid-cols-7 gap-2">
            {TRIP_WEEKDAYS.map((weekday) => (
              <div
                key={weekday}
                className="px-1 text-center text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"
              >
                {weekday}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week.startDate} className="mt-2">
              <p className="mb-1.5 text-xs font-semibold text-muted">
                {formatTripWeekRange(week.startDate)}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {week.cells.map((day, column) => {
                  if (!day) {
                    return (
                      <div
                        key={`${week.startDate}-off-${column}`}
                        aria-hidden="true"
                        className="min-h-36 rounded-lg border border-dashed border-border bg-surface/50"
                      />
                    );
                  }
                  const dayItems = itemsForDay(items, day.index, days.length);
                  const key = `day-${day.index}`;
                  const active = overKey === key && draggingId != null;
                  return (
                    <div
                      key={day.date}
                      aria-label={`${day.label}, ${day.detail}`}
                      className={`flex min-h-36 flex-col rounded-lg border p-2 transition-colors ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-border bg-white"
                      }`}
                      onDragOver={(event) => allowDrop(event, key)}
                      onDragLeave={(event) => {
                        const next = event.relatedTarget;
                        if (next instanceof Node && event.currentTarget.contains(next)) return;
                        if (overKey === key) setOverKey(null);
                      }}
                      onDrop={(event) => dropOn(event, day.index)}
                    >
                      <p className="text-xs font-semibold text-heading">{day.label}</p>
                      {day.detail ? (
                        <p className="text-[0.7rem] text-muted">{day.detail}</p>
                      ) : null}
                      <div className="mt-2 flex flex-1 flex-col gap-1.5">
                        {dayItems.length === 0 ? (
                          <p className="text-xs leading-relaxed text-muted">
                            Nothing on this day yet. Add a booking above and assign it to{" "}
                            {day.label}.
                          </p>
                        ) : (
                          dayItems.map((item) => (
                            <WeekChip
                              key={item.id}
                              item={item}
                              days={days}
                              dragging={draggingId === item.id}
                              onAssignDay={onAssignDay}
                              onEdit={onEdit}
                              onDragStart={setDraggingId}
                              onDragEnd={endDrag}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section
        className={`panel-soft px-4 py-4 ${
          overKey === "unscheduled" && draggingId ? "ring-2 ring-accent/40" : ""
        }`}
        aria-labelledby={`${headingId}-week-unscheduled-title`}
        onDragOver={(event) => allowDrop(event, "unscheduled")}
        onDragLeave={(event) => {
          const next = event.relatedTarget;
          if (next instanceof Node && event.currentTarget.contains(next)) return;
          if (overKey === "unscheduled") setOverKey(null);
        }}
        onDrop={(event) => dropOn(event, null)}
      >
        <h4
          id={`${headingId}-week-unscheduled-title`}
          className="font-display font-bold text-heading"
        >
          Unscheduled
          {unscheduled.length > 0 ? (
            <span className="ml-2 text-sm font-semibold text-accent">
              {unscheduled.length}
            </span>
          ) : null}
        </h4>
        {unscheduled.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            Bookings without a day land here. Choose a day when you add one.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {unscheduled.map((item) => (
              <li key={item.id}>
                <WeekChip
                  item={item}
                  days={days}
                  dragging={draggingId === item.id}
                  onAssignDay={onAssignDay}
                  onEdit={onEdit}
                  onDragStart={setDraggingId}
                  onDragEnd={endDrag}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
