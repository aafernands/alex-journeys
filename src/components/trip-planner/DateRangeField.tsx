"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { plan } from "@/components/trip-planner/density";
import {
  WEEKDAY_LABELS,
  applyRangePick,
  buildMonthGrid,
  formatCalendarDay,
  formatCalendarDayLong,
  formatCalendarMonth,
  isDateDisabled,
  monthCursorFromIso,
  rangeMark,
  rangePrompt,
  shiftIsoMonth,
  shiftMonth,
  todayIso,
  visibleMonthCursor,
  weekdayLong,
  weekBound,
  addDays,
  type MonthCursor,
} from "@/lib/date-range";

type Props = {
  id: string;
  startDate: string;
  endDate: string;
  onChange: (next: { startDate: string; endDate: string }) => void;
  startLabel?: string;
  endLabel?: string;
  dialogLabel?: string;
  startError?: string;
  endError?: string;
  /** Trip dates allow a same-day interval. Stays require check-out after check-in. */
  allowSameDay?: boolean;
  min?: string;
  max?: string;
  nameStart?: string;
  nameEnd?: string;
};

function useWideCalendar(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 640px)");
    const apply = () => setWide(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return wide;
}

export function DateRangeField({
  id,
  startDate,
  endDate,
  onChange,
  startLabel = "Start",
  endLabel = "End",
  dialogLabel = "Trip dates",
  startError,
  endError,
  allowSameDay = true,
  min,
  max,
  nameStart,
  nameEnd,
}: Props) {
  const reactId = useId();
  const titleId = `${reactId}-title`;
  const promptId = `${reactId}-prompt`;
  const dialogId = `${reactId}-dialog`;
  const rootRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const focusDay = useRef(false);
  const focusDone = useRef(false);
  const wide = useWideCalendar();
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState<MonthCursor>({ year: 2027, month: 1 });
  const [focused, setFocused] = useState("");
  const [today, setToday] = useState("");
  const [hover, setHover] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const labels = { start: startLabel, end: endLabel };
  const prompt = rangePrompt(startDate, endDate, labels);
  const bounds = { min, max };
  const pickingEnd = Boolean(startDate) && !endDate;
  const preview =
    pickingEnd &&
    hover &&
    hover >= startDate &&
    (allowSameDay || hover !== startDate) &&
    !isDateDisabled(hover, bounds)
      ? hover
      : "";
  const visualEnd = endDate || preview;
  const months: MonthCursor[] = wide ? [cursor, shiftMonth(cursor, 1)] : [cursor];
  const describedBy = [startError ? `${id}-start-error` : "", endError ? `${id}-end-error` : ""]
    .filter(Boolean)
    .join(" ");

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    setHover("");
    setAnnouncement("");
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  function openCalendar() {
    const todayValue = todayIso();
    const anchor = monthCursorFromIso(startDate) ? startDate : todayValue;
    const anchorMonth = monthCursorFromIso(anchor) ?? {
      year: Number(todayValue.slice(0, 4)),
      month: Number(todayValue.slice(5, 7)),
    };
    setToday(todayValue);
    setCursor(anchorMonth);
    setFocused(anchor);
    setHover("");
    focusDay.current = true;
    setOpen(true);
  }

  function moveFocus(next: string | null) {
    if (!next || isDateDisabled(next, bounds)) return;
    focusDay.current = true;
    setFocused(next);
    setCursor((current) => visibleMonthCursor(next, current, wide ? 2 : 1));
  }

  function pick(iso: string) {
    if (isDateDisabled(iso, bounds)) return;
    const next = applyRangePick(startDate, endDate, iso, { allowSameDay });
    onChange(next);
    setHover("");
    if (next.endDate) {
      focusDone.current = true;
      setFocused(next.endDate);
      setCursor((current) => visibleMonthCursor(next.endDate, current, wide ? 2 : 1));
      return;
    }
    focusDay.current = true;
    setFocused(next.startDate);
    setCursor((current) =>
      visibleMonthCursor(next.startDate, current, wide ? 2 : 1),
    );
  }

  function onGridKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    let next: string | null = null;
    if (key === "ArrowRight") next = addDays(focused, 1);
    else if (key === "ArrowLeft") next = addDays(focused, -1);
    else if (key === "ArrowDown") next = addDays(focused, 7);
    else if (key === "ArrowUp") next = addDays(focused, -7);
    else if (key === "Home") next = weekBound(focused, "start");
    else if (key === "End") next = weekBound(focused, "end");
    else if (key === "PageDown") next = shiftIsoMonth(focused, wide ? 2 : 1);
    else if (key === "PageUp") next = shiftIsoMonth(focused, wide ? -2 : -1);
    else return;
    event.preventDefault();
    moveFocus(next);
  }

  useEffect(() => {
    if (!open) return;
    setAnnouncement(prompt);
  }, [open, prompt]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const panel: HTMLDivElement = dialog;

    if (focusDone.current) {
      focusDone.current = false;
      doneRef.current?.focus();
    } else if (focusDay.current) {
      focusDay.current = false;
      panel.querySelector<HTMLButtonElement>(`button[data-iso="${focused}"]`)?.focus();
    }

    function focusable(): HTMLElement[] {
      return [
        ...panel.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input"),
      ].filter((node) => node.tabIndex !== -1);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, focused, cursor, wide, startDate, endDate, close]);

  useEffect(() => {
    const popover = dialogRef.current;
    if (!popover) return;
    if (!open || !wide) {
      popover.style.left = "";
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    popover.style.left = "0px";
    const rect = root.getBoundingClientRect();
    const overflow = rect.left + popover.offsetWidth - (window.innerWidth - 16);
    popover.style.left = overflow > 0 ? `${-overflow}px` : "0px";
  }, [open, wide, cursor, startDate, endDate]);

  const startText = formatCalendarDay(startDate) || "Add date";
  const endText = formatCalendarDay(endDate) || "Add date";

  return (
    <div>
      {nameStart ? <input type="hidden" name={nameStart} value={startDate} /> : null}
      {nameEnd ? <input type="hidden" name={nameEnd} value={endDate} /> : null}
      <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`${plan.input} plan-date-trigger flex w-full items-center gap-3 text-left`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? dialogId : undefined}
        aria-invalid={Boolean(startError || endError) || undefined}
        aria-describedby={describedBy || undefined}
        onClick={() => (open ? close(false) : openCalendar())}
      >
        <span className="sr-only">{dialogLabel}. </span>
        <span className="min-w-0 flex-1">
          <span className={`${plan.label} block`}>{startLabel}</span>
          <span className={startDate ? "block truncate text-heading" : "block truncate text-muted"}>
            {startText}
          </span>
        </span>
        <span aria-hidden="true" className="text-muted">
          –
        </span>
        <span className="min-w-0 flex-1">
          <span className={`${plan.label} block`}>{endLabel}</span>
          <span className={endDate ? "block truncate text-heading" : "block truncate text-muted"}>
            {endText}
          </span>
        </span>
        <CalendarDays aria-hidden="true" className="size-5 shrink-0 text-muted" />
      </button>

      {open ? (
        <>
          <div className="plan-date-backdrop" onClick={() => close()} />
          <div
            ref={dialogRef}
            id={dialogId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={promptId}
            className="plan-date-popover plan-control glass-strong"
          >
            <p id={titleId} className="sr-only">
              {dialogLabel}
            </p>
            <p id={promptId} className={`${plan.body} font-semibold text-heading`}>
              {prompt}
            </p>
            <p className="sr-only" aria-live="polite">
              {announcement}
            </p>

            <div className="plan-date-scroll plan-follow">
            <div className="plan-date-months">
              {months.map((month, index) => {
                const monthId = `${reactId}-month-${month.year}-${month.month}`;
                const weeks = buildMonthGrid(month);
                const showPrev = index === 0;
                const showNext = index === months.length - 1;
                const neighborStart =
                  index === 0 && months[1]
                    ? `${months[1].year}-${String(months[1].month).padStart(2, "0")}-01`
                    : "";
                return (
                  <div key={`${month.year}-${month.month}`}>
                    <div className="plan-date-nav">
                      {showPrev ? (
                        <button
                          type="button"
                          className="plan-date-nav-btn"
                          aria-label="Previous month"
                          onClick={() => setCursor((current) => shiftMonth(current, -1))}
                        >
                          <ChevronLeft aria-hidden="true" className="size-5" />
                        </button>
                      ) : (
                        <span />
                      )}
                      <h3 id={monthId} className={`${plan.h4} text-center`}>
                        {formatCalendarMonth(month)}
                      </h3>
                      {showNext ? (
                        <button
                          type="button"
                          className="plan-date-nav-btn"
                          aria-label="Next month"
                          onClick={() => setCursor((current) => shiftMonth(current, 1))}
                        >
                          <ChevronRight aria-hidden="true" className="size-5" />
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                    <div
                      role="grid"
                      aria-labelledby={monthId}
                      onKeyDown={onGridKeyDown}
                      onPointerLeave={() => setHover("")}
                    >
                      <div role="row" className="plan-date-weekdays">
                        {WEEKDAY_LABELS.map((label, weekday) => (
                          <span
                            key={label}
                            role="columnheader"
                            aria-label={weekdayLong(weekday)}
                            className="plan-date-weekday"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      {weeks.map((week) => (
                        <div key={week[0].iso} role="row" className="plan-date-grid">
                          {week.map((day) => {
                            const coveredByNeighbor =
                              wide &&
                              !day.inMonth &&
                              (index === 0
                                ? day.iso >= neighborStart
                                : day.iso < `${month.year}-${String(month.month).padStart(2, "0")}-01`);
                            if (coveredByNeighbor) {
                              return (
                                <span
                                  key={day.iso}
                                  role="gridcell"
                                  aria-hidden="true"
                                  className="plan-date-day"
                                />
                              );
                            }
                            const disabled = isDateDisabled(day.iso, bounds);
                            const mark = rangeMark(day.iso, startDate, visualEnd);
                            const selected =
                              day.iso === startDate || (Boolean(endDate) && day.iso === endDate);
                            const label = formatCalendarDayLong(day.iso);
                            const named =
                              day.iso === startDate && day.iso === endDate
                                ? `${label}, ${startLabel} and ${endLabel}`
                                : day.iso === startDate
                                  ? `${label}, ${startLabel}`
                                  : day.iso === endDate
                                    ? `${label}, ${endLabel}`
                                    : mark === "between"
                                      ? `${label}, in selected range`
                                      : label;
                            return (
                              <span
                                key={day.iso}
                                role="gridcell"
                                data-range={mark ?? undefined}
                                data-selected={selected ? "true" : undefined}
                                data-outside={day.inMonth ? undefined : "true"}
                                data-today={day.iso === today ? "true" : undefined}
                                data-preview={preview && day.iso === preview ? "end" : undefined}
                                className="plan-date-day"
                              >
                                <button
                                  type="button"
                                  data-iso={day.iso}
                                  tabIndex={day.iso === focused ? 0 : -1}
                                  disabled={disabled}
                                  aria-disabled={disabled || undefined}
                                  aria-selected={selected || undefined}
                                  aria-current={day.iso === today ? "date" : undefined}
                                  aria-label={named}
                                  onClick={() => pick(day.iso)}
                                  onPointerEnter={() => {
                                    if (!disabled) setHover(day.iso);
                                  }}
                                  onFocus={() => setFocused(day.iso)}
                                >
                                  {day.day}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            </div>

            <div className="plan-inline-actions plan-date-footer plan-follow justify-between">
              <button
                type="button"
                className={`${plan.textBtn} text-link disabled:opacity-40`}
                onClick={() => {
                  onChange({ startDate: "", endDate: "" });
                  setHover("");
                  focusDay.current = true;
                }}
                disabled={!startDate && !endDate}
              >
                Clear
              </button>
              <button
                ref={doneRef}
                type="button"
                className="btn btn-primary"
                onClick={() => close()}
              >
                Done
              </button>
            </div>
          </div>
        </>
      ) : null}
      </div>
      {startError ? (
        <p id={`${id}-start-error`} className={`${plan.error} mt-2`}>
          {startError}
        </p>
      ) : null}
      {endError ? (
        <p id={`${id}-end-error`} className={`${plan.error} mt-2`}>
          {endError}
        </p>
      ) : null}
    </div>
  );
}
