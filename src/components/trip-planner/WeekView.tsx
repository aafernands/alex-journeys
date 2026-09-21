"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { plan } from "@/components/trip-planner/density";
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

function itemsForDay(items: TripItem[], dayIndex: number, dayCount: number): TripItem[] {
  return items
    .filter((item) => scheduledDayIndex(item, dayCount) === dayIndex)
    .sort(compareScheduledItems);
}

function WeekChip({
  item,
  days,
  dragging,
  idPrefix,
  onAssignDay,
  onEdit,
  onDragStart,
  onDragEnd,
}: {
  item: TripItem;
  days: TripDay[];
  dragging: boolean;
  idPrefix: string;
  onAssignDay: (id: string, dayIndex: number | null) => void;
  onEdit: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const dayIndex = scheduledDayIndex(item, days.length);
  return (
    <article
      className={`${plan.chipCard} plan-stack-tight ${
        item.status === "booked"
          ? "border-accent/30 bg-accent/10"
          : item.status === "skipped"
            ? "border-border bg-surface-soft"
            : "border-border bg-white"
      } ${dragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`${plan.caption} min-w-0 font-semibold text-heading`}>
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
          className={`${plan.chip} shrink-0 cursor-grab border-transparent text-muted active:cursor-grabbing`}
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
      <p className={plan.label}>{TRIP_STATUS_LABEL[item.status]}</p>
      <select
        id={`${idPrefix}-day-${item.id}`}
        className={plan.input}
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
          </option>
        ))}
      </select>
      <button
        type="button"
        className={`${plan.textBtn} self-start text-accent hover:underline`}
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

  function renderItems(dayItems: TripItem[], day: TripDay, idPrefix: string): ReactNode {
    if (dayItems.length === 0) {
      return (
        <p className={`${plan.body} text-muted`}>
          Nothing on this day yet. Add a booking above and assign it to {day.label}.
        </p>
      );
    }
    return dayItems.map((item) => (
      <WeekChip
        key={item.id}
        item={item}
        days={days}
        dragging={draggingId === item.id}
        idPrefix={idPrefix}
        onAssignDay={onAssignDay}
        onEdit={onEdit}
        onDragStart={setDraggingId}
        onDragEnd={endDrag}
      />
    ));
  }

  return (
    <div className="plan-stack plan-follow">
      <p className={`${plan.prose} text-muted`}>
        Drag a booking onto a day, or choose a day on the booking. Time stays on the
        booking when you move it.
      </p>
      <div className="plan-stack sm:hidden">
        {days.map((day) => {
          const dayItems = itemsForDay(items, day.index, days.length);
          const key = `day-${day.index}`;
          const active = overKey === key && draggingId != null;
          return (
            <div
              key={day.date}
              aria-label={`${day.label}, ${day.detail}`}
              className={`plan-inset plan-stack-tight border transition-colors ${
                active ? "border-accent bg-accent/10" : "border-border bg-white"
              }`}
              onDragOver={(event) => allowDrop(event, key)}
              onDragLeave={(event) => {
                const next = event.relatedTarget;
                if (next instanceof Node && event.currentTarget.contains(next)) return;
                if (overKey === key) setOverKey(null);
              }}
              onDrop={(event) => dropOn(event, day.index)}
            >
              <div>
                <p className={plan.h4}>{day.label}</p>
                {day.detail ? (
                  <p className={`${plan.caption} text-muted`}>{day.detail}</p>
                ) : null}
              </div>
              <div className="plan-stack-tight">{renderItems(dayItems, day, "week-stack")}</div>
            </div>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto pb-1 sm:block">
        <div className="min-w-[52rem]" aria-label="Trip week">
          <div className="grid grid-cols-7 gap-2">
            {TRIP_WEEKDAYS.map((weekday) => (
              <div key={weekday} className={`${plan.label} px-1 text-center`}>
                {weekday}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week.startDate} className="plan-follow">
              <p className={`${plan.caption} mb-2 font-semibold text-muted`}>
                {formatTripWeekRange(week.startDate)}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {week.cells.map((day, column) => {
                  if (!day) {
                    return (
                      <div
                        key={`${week.startDate}-off-${column}`}
                        aria-hidden="true"
                        className="plan-control min-h-36 border border-dashed border-border bg-surface/50"
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
                      className={`plan-inset flex min-h-36 flex-col gap-3 border transition-colors ${
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
                      <div>
                        <p className={`${plan.caption} font-semibold text-heading`}>{day.label}</p>
                        {day.detail ? (
                          <p className={`${plan.caption} text-muted`}>{day.detail}</p>
                        ) : null}
                      </div>
                      <div className="plan-stack-tight flex-1">{renderItems(dayItems, day, "week-grid")}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <section
        className={`${plan.soft} ${
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
          className={plan.h4}
        >
          Unscheduled
          {unscheduled.length > 0 ? (
            <span className={`${plan.caption} ml-2 font-semibold text-accent`}>
              {unscheduled.length}
            </span>
          ) : null}
        </h4>
        {unscheduled.length === 0 ? (
          <p className={`${plan.body} plan-follow text-muted`}>
            Bookings without a day land here. Choose a day when you add one.
          </p>
        ) : (
          <ul className="plan-grid-2 plan-follow">
            {unscheduled.map((item) => (
              <li key={item.id}>
                <WeekChip
                  item={item}
                  days={days}
                  dragging={draggingId === item.id}
                  idPrefix="week-open"
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
