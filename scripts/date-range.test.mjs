import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  applyRangePick,
  buildMonthGrid,
  formatCalendarDay,
  formatCalendarDayLong,
  isDateDisabled,
  nightsBetween,
  rangeMark,
  rangePrompt,
  shiftIsoMonth,
  todayIso,
  visibleMonthCursor,
  weekBound,
} from "../src/lib/date-range.ts";
import { validateDetails, initialPlannerState } from "../src/lib/trip-planner-model.ts";

describe("date range calendar", () => {
  it("builds April 2027 with Thursday the 1st and a leap day in 2028", () => {
    const april = buildMonthGrid({ year: 2027, month: 4 });
    assert.equal(april[0][4].iso, "2027-04-01");
    assert.equal(april[0][4].inMonth, true);
    assert.equal(april[0][0].inMonth, false);
    assert.equal(april[0][3].iso, "2027-03-31");
    const flat = april.flat();
    assert.equal(flat.filter((day) => day.inMonth).length, 30);
    assert.ok(flat.every((day) => day.iso.length === 10));

    const february = buildMonthGrid({ year: 2028, month: 2 });
    assert.ok(february.flat().some((day) => day.iso === "2028-02-29" && day.inMonth));
  });

  it("moves by day, week, and month without inventing dates", () => {
    assert.equal(addDays("2027-04-30", 1), "2027-05-01");
    assert.equal(addDays("2027-03-01", -1), "2027-02-28");
    assert.equal(shiftIsoMonth("2027-01-31", 1), "2027-02-28");
    assert.equal(shiftIsoMonth("2028-01-31", 1), "2028-02-29");
    assert.equal(weekBound("2027-04-12", "start"), "2027-04-11");
    assert.equal(weekBound("2027-04-12", "end"), "2027-04-17");
    assert.equal(addDays("2027-02-31", 1), null);
  });

  it("picks a start and then an end in one pass", () => {
    const start = applyRangePick("", "", "2027-04-12");
    assert.deepEqual(start, { startDate: "2027-04-12", endDate: "" });
    const end = applyRangePick(start.startDate, start.endDate, "2027-04-19");
    assert.deepEqual(end, { startDate: "2027-04-12", endDate: "2027-04-19" });
    assert.equal(nightsBetween(end.startDate, end.endDate), 7);
    assert.equal(rangeMark("2027-04-12", end.startDate, end.endDate), "start");
    assert.equal(rangeMark("2027-04-15", end.startDate, end.endDate), "between");
    assert.equal(rangeMark("2027-04-19", end.startDate, end.endDate), "end");
    assert.equal(rangeMark("2027-04-11", end.startDate, end.endDate), null);
  });

  it("restarts when the next day is before the start, and allows a same-day trip", () => {
    assert.deepEqual(applyRangePick("2027-04-12", "", "2027-04-01"), {
      startDate: "2027-04-01",
      endDate: "",
    });
    assert.deepEqual(applyRangePick("2027-04-12", "", "2027-04-12"), {
      startDate: "2027-04-12",
      endDate: "2027-04-12",
    });
    assert.deepEqual(
      applyRangePick("2027-04-12", "", "2027-04-12", { allowSameDay: false }),
      { startDate: "2027-04-12", endDate: "" },
    );
    assert.deepEqual(applyRangePick("2027-04-12", "2027-04-19", "2027-05-01"), {
      startDate: "2027-05-01",
      endDate: "",
    });
    assert.equal(rangeMark("2027-04-12", "2027-04-12", ""), "single");
    assert.equal(rangeMark("2027-04-19", "2027-04-12", "2027-04-01"), null);
  });

  it("disables dates outside an optional bound and keeps the focused month in view", () => {
    assert.equal(isDateDisabled("2027-04-01", { min: "2027-04-12" }), true);
    assert.equal(isDateDisabled("2027-04-12", { min: "2027-04-12" }), false);
    assert.equal(isDateDisabled("2027-05-01", { max: "2027-04-30" }), true);
    assert.equal(isDateDisabled("nope", {}), true);

    const april = { year: 2027, month: 4 };
    assert.deepEqual(visibleMonthCursor("2027-04-19", april, 1), april);
    assert.deepEqual(visibleMonthCursor("2027-05-02", april, 1), {
      year: 2027,
      month: 5,
    });
    assert.deepEqual(visibleMonthCursor("2027-05-02", april, 2), april);
    assert.deepEqual(visibleMonthCursor("2027-06-01", april, 2), {
      year: 2027,
      month: 5,
    });
  });

  it("describes an empty interval, a start, and a finished range", () => {
    const labels = { start: "Start", end: "End" };
    assert.equal(rangePrompt("", "", labels), "Choose the start, then the end.");
    assert.equal(
      rangePrompt("2027-04-12", "", labels),
      "Apr 12, 2027 is the start. Now choose the end.",
    );
    assert.equal(
      rangePrompt("2027-04-12", "2027-04-19", labels),
      "Apr 12, 2027 – Apr 19, 2027. 7 nights. Choose a new start to change it.",
    );
    assert.match(rangePrompt("2027-04-12", "2027-04-01", labels), /before the start/);
    assert.equal(formatCalendarDay("2027-04-12"), "Apr 12, 2027");
    assert.equal(formatCalendarDayLong("2027-04-12"), "Monday, April 12, 2027");
    assert.equal(todayIso(new Date(2027, 3, 12)), "2027-04-12");
  });

  it("keeps a picked interval valid for the trip planner", () => {
    const picked = applyRangePick("", "", "2027-04-12");
    const range = applyRangePick(picked.startDate, picked.endDate, "2027-04-19");
    const errors = validateDetails(
      {
        ...initialPlannerState(),
        categories: ["hotel"],
        destination: "Lisbon",
        ...range,
      },
      true,
    );
    assert.equal(errors.startDate, undefined);
    assert.equal(errors.endDate, undefined);
  });
});
