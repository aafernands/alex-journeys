/**
 * Calendar math for the trip date-range control.
 * Dates stay YYYY-MM-DD strings — the same shape Plan a Trip and Stays already store.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

export type MonthCursor = { year: number; month: number };

export type CalendarDay = {
  iso: string;
  day: number;
  inMonth: boolean;
};

export type RangeMark = "start" | "end" | "between" | "single" | null;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** Local calendar day, so the open month matches the traveler’s clock. */
export function todayIso(now = new Date()): string {
  return isoFromParts(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function parseRealIsoDate(
  iso: string,
): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

export function isRealIsoDate(iso: string): boolean {
  return parseRealIsoDate(iso) !== null;
}

export function monthCursorFromIso(iso: string): MonthCursor | null {
  const parsed = parseRealIsoDate(iso);
  if (!parsed) return null;
  return { year: parsed.year, month: parsed.month };
}

export function shiftMonth(cursor: MonthCursor, delta: number): MonthCursor {
  const date = new Date(Date.UTC(cursor.year, cursor.month - 1 + delta, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1 };
}

export function compareMonth(a: MonthCursor, b: MonthCursor): number {
  if (a.year !== b.year) return a.year - b.year;
  return a.month - b.month;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addDays(iso: string, days: number): string | null {
  const parsed = parseRealIsoDate(iso);
  if (!parsed) return null;
  const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
  return isoFromParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function shiftIsoMonth(iso: string, delta: number): string | null {
  const parsed = parseRealIsoDate(iso);
  if (!parsed) return null;
  const cursor = shiftMonth({ year: parsed.year, month: parsed.month }, delta);
  const day = Math.min(parsed.day, daysInMonth(cursor.year, cursor.month));
  return isoFromParts(cursor.year, cursor.month, day);
}

/** Sunday-start or Saturday-end of the ISO week that contains `iso`. */
export function weekBound(iso: string, edge: "start" | "end"): string | null {
  const parsed = parseRealIsoDate(iso);
  if (!parsed) return null;
  const weekday = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay();
  const delta = edge === "start" ? -weekday : 6 - weekday;
  return addDays(iso, delta);
}

export function formatCalendarMonth(cursor: MonthCursor): string {
  return `${MONTHS[cursor.month - 1]} ${cursor.year}`;
}

export function formatCalendarDay(iso: string): string {
  const parsed = parseRealIsoDate(iso);
  if (!parsed) return "";
  return `${MONTHS[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

export function formatCalendarDayLong(iso: string): string {
  const parsed = parseRealIsoDate(iso);
  if (!parsed) return "";
  const weekday = new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day),
  ).getUTCDay();
  return `${WEEKDAYS_LONG[weekday]}, ${MONTHS_LONG[parsed.month - 1]} ${parsed.day}, ${parsed.year}`;
}

export function weekdayLong(index: number): string {
  return WEEKDAYS_LONG[index] ?? "";
}

export function nightsBetween(start: string, end: string): number | null {
  if (!isRealIsoDate(start) || !isRealIsoDate(end)) return null;
  const a = Date.parse(`${start}T00:00:00Z`);
  const b = Date.parse(`${end}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * Weeks that intersect the month. Leading and trailing cells are real
 * neighboring days so a selected interval can paint across the month edge.
 */
export function buildMonthGrid(cursor: MonthCursor): CalendarDay[][] {
  const count = daysInMonth(cursor.year, cursor.month);
  const firstWeekday = new Date(Date.UTC(cursor.year, cursor.month - 1, 1)).getUTCDay();
  const prev = shiftMonth(cursor, -1);
  const prevCount = daysInMonth(prev.year, prev.month);
  const cells: CalendarDay[] = [];

  for (let index = 0; index < firstWeekday; index += 1) {
    const day = prevCount - firstWeekday + 1 + index;
    cells.push({
      iso: isoFromParts(prev.year, prev.month, day),
      day,
      inMonth: false,
    });
  }
  for (let day = 1; day <= count; day += 1) {
    cells.push({
      iso: isoFromParts(cursor.year, cursor.month, day),
      day,
      inMonth: true,
    });
  }
  const next = shiftMonth(cursor, 1);
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      iso: isoFromParts(next.year, next.month, nextDay),
      day: nextDay,
      inMonth: false,
    });
    nextDay += 1;
  }

  const weeks: CalendarDay[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function isDateDisabled(
  iso: string,
  bounds: { min?: string; max?: string },
): boolean {
  if (!isRealIsoDate(iso)) return true;
  if (bounds.min && isRealIsoDate(bounds.min) && iso < bounds.min) return true;
  if (bounds.max && isRealIsoDate(bounds.max) && iso > bounds.max) return true;
  return false;
}

/**
 * One click in an open calendar.
 * A finished interval starts over. The second click sets the end when it
 * falls on or after the start (`allowSameDay`, the trip default). Stays pass
 * `allowSameDay: false` so check-out stays after check-in.
 */
export function applyRangePick(
  startDate: string,
  endDate: string,
  picked: string,
  options: { allowSameDay?: boolean } = {},
): { startDate: string; endDate: string } {
  const allowSameDay = options.allowSameDay !== false;
  const pickingEnd = Boolean(startDate) && !endDate;
  if (!pickingEnd) return { startDate: picked, endDate: "" };
  const sameDay = picked === startDate;
  if (picked < startDate || (sameDay && !allowSameDay)) {
    return { startDate: picked, endDate: "" };
  }
  return { startDate, endDate: picked };
}

export function rangeMark(iso: string, start: string, end: string): RangeMark {
  if (!start || !isRealIsoDate(iso) || !isRealIsoDate(start)) return null;
  const visualEnd = end && isRealIsoDate(end) && end >= start ? end : "";
  if (!visualEnd) return iso === start ? "single" : null;
  if (iso === start && iso === visualEnd) return "single";
  if (iso === start) return "start";
  if (iso === visualEnd) return "end";
  if (iso > start && iso < visualEnd) return "between";
  return null;
}

/** Keep `iso` inside the months currently on screen, shifting as little as possible. */
export function visibleMonthCursor(
  iso: string,
  current: MonthCursor,
  months: 1 | 2,
): MonthCursor {
  const target = monthCursorFromIso(iso);
  if (!target) return current;
  const last =
    months === 2 ? shiftMonth(current, 1) : current;
  if (compareMonth(target, current) >= 0 && compareMonth(target, last) <= 0) {
    return current;
  }
  if (months === 2 && compareMonth(target, current) > 0) {
    return shiftMonth(target, -1);
  }
  return target;
}

export function rangePrompt(
  startDate: string,
  endDate: string,
  labels: { start: string; end: string },
): string {
  const startName = labels.start.toLowerCase();
  const endName = labels.end.toLowerCase();
  if (startDate && endDate && isRealIsoDate(startDate) && isRealIsoDate(endDate)) {
    if (endDate < startDate) {
      return `${formatCalendarDay(endDate)} is before the ${startName}. Choose the ${startName}, then the ${endName}.`;
    }
    const nights = nightsBetween(startDate, endDate);
    const range = `${formatCalendarDay(startDate)} – ${formatCalendarDay(endDate)}`;
    if (nights === 0) {
      return `${range}. Same day. Choose a new ${startName} to change it.`;
    }
    if (nights !== null && nights > 0) {
      const nightLabel = nights === 1 ? "night" : "nights";
      return `${range}. ${nights} ${nightLabel}. Choose a new ${startName} to change it.`;
    }
  }
  if (startDate && isRealIsoDate(startDate)) {
    return `${formatCalendarDay(startDate)} is the ${startName}. Now choose the ${endName}.`;
  }
  return `Choose the ${startName}, then the ${endName}.`;
}
