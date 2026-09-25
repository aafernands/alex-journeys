"use client";

import { useState, type DragEvent, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Plus, GripVertical } from "lucide-react";
import { plan } from "@/components/trip-planner/density";
import { ItineraryItemRow } from "@/components/trip-planner/ItineraryItemRow";
import {
  compareScheduledItems,
  formatTripWeekRange,
  scheduledDayIndex,
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
  onRemove: (id: string) => void;
  onAddDay: (dayIndex: number) => void;
};

function itemsForDay(items: TripItem[], dayIndex: number, days: TripDay[]): TripItem[] {
  return items
    .filter((item) => scheduledDayIndex(item, days) === dayIndex)
    .sort(compareScheduledItems);
}

function WeekChip({
  item,
  days,
  dragging,
  idPrefix,
  onAssignDay,
  onEdit,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  item: TripItem;
  days: TripDay[];
  dragging: boolean;
  idPrefix: string;
  onAssignDay: (id: string, dayIndex: number | null) => void;
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}) {
  const dayIndex = scheduledDayIndex(item, days);
  return (
    <ItineraryItemRow
      item={item}
      dragging={dragging}
      onEdit={() => onEdit(item.id)}
      onRemove={() => onRemove(item.id)}
      drag={
        <button
          type="button"
          draggable
          aria-label={`Drag ${item.title} to a day`}
          title="Drag to a day"
          className="plan-timeline-drag"
          onDragStart={(event) => {
            event.dataTransfer.setData("text/plain", item.id);
            event.dataTransfer.effectAllowed = "move";
            const card = event.currentTarget.closest("article");
            if (card) event.dataTransfer.setDragImage(card, 16, 16);
            onDragStart(item.id);
          }}
          onDragEnd={onDragEnd}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      }
      footer={
        <select
          id={`${idPrefix}-day-${item.id}`}
          className={`${plan.input} plan-week-day-select`}
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
      }
    />
  );
}

export function WeekView({ headingId, days, items, onAssignDay, onEdit, onRemove, onAddDay }: Props) {
  const weeks = tripWeeks(days);
  const [weekIndex, setWeekIndex] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const currentIndex = Math.min(weekIndex, Math.max(0, weeks.length - 1));
  const week = weeks[currentIndex];
  const visibleDays = week?.cells.filter((day): day is TripDay => day !== null) ?? [];
  const activeDay = visibleDays.find((day) => day.index === selectedDay) ?? visibleDays[0];
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overKey, setOverKey] = useState<string | null>(null);
  const unscheduled = items
    .filter((item) => scheduledDayIndex(item, days) == null)
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

  function renderItems(dayItems: TripItem[], idPrefix: string): ReactNode {
    if (dayItems.length === 0) {
      return (
        <p className={`${plan.caption} text-muted plan-week-empty`}>
          A little room to explore.
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
        onRemove={onRemove}
        onDragStart={setDraggingId}
        onDragEnd={endDrag}
      />
    ));
  }

  return (
    <div className="plan-stack plan-follow plan-week-view">
      {week ? <div className="plan-week-navigation">
        <div aria-live="polite">
          <p className={plan.label}>Week {currentIndex + 1} of {weeks.length}</p>
          <h4 className={plan.h4}>{formatTripWeekRange(week.startDate)}</h4>
        </div>
        <div className="flex gap-2">
          <button type="button" className="plan-week-nav" aria-label="Previous week" disabled={currentIndex === 0} onClick={() => setWeekIndex(currentIndex - 1)}><ChevronLeft size={20} aria-hidden="true" /></button>
          <button type="button" className="plan-week-nav" aria-label="Next week" disabled={currentIndex >= weeks.length - 1} onClick={() => setWeekIndex(currentIndex + 1)}><ChevronRight size={20} aria-hidden="true" /></button>
        </div>
      </div> : null}
      <p className={`${plan.prose} text-muted plan-desktop-only`}>
        Drag a booking onto a day, or choose a day on the booking. Time stays on the
        booking when you move it.
      </p>
      <div className="plan-stack plan-week-mobile">
        <div className="plan-week-day-picker" role="group" aria-label="Choose a day">
          {visibleDays.map((day) => <button key={day.index} type="button" aria-pressed={activeDay?.index === day.index} onClick={() => setSelectedDay(day.index)}>
            <span>{day.label}</span><span>{day.detail}</span>
          </button>)}
        </div>
        {(activeDay ? [activeDay] : []).map((day) => {
          const dayItems = itemsForDay(items, day.index, days);
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
              <div className="plan-timeline">{renderItems(dayItems, "week-stack")}</div>
              <button type="button" className="plan-week-add" onClick={() => onAddDay(day.index)}><Plus size={16} aria-hidden="true" /> Add plan</button>
            </div>
          );
        })}
      </div>
      <div className="plan-week-desktop overflow-x-auto pb-1">
        <div className="plan-week-calendar" aria-label="Trip week">
          <div className="grid grid-cols-7 gap-2">
            {TRIP_WEEKDAYS.map((weekday) => (
              <div key={weekday} className={`${plan.label} px-1 text-center`}>
                {weekday}
              </div>
            ))}
          </div>
          {(week ? [week] : []).map((week) => (
            <div key={week.startDate} className="plan-follow">
              <div className="grid grid-cols-7 gap-2">
                {week.cells.map((day, column) => {
                  if (!day) {
                    return (
                      <div
                        key={`${week.startDate}-off-${column}`}
                        aria-hidden="true"
                        className="plan-week-off"
                      />
                    );
                  }
                  const dayItems = itemsForDay(items, day.index, days);
                  const key = `day-${day.index}`;
                  const active = overKey === key && draggingId != null;
                  return (
                    <div
                      key={day.date}
                      aria-label={`${day.label}, ${day.detail}`}
                      className={`plan-inset plan-week-day flex min-h-36 flex-col gap-3 border transition-colors ${
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
                      <div className="plan-timeline flex-1">{renderItems(dayItems, "week-grid")}</div>
                      <button type="button" className="plan-week-add" aria-label={`Add plan to ${day.label}`} onClick={() => onAddDay(day.index)}><Plus size={16} aria-hidden="true" /> Add plan</button>
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
                  onRemove={onRemove}
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
