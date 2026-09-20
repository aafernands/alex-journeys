"use client";

import type { PostItinerary, PostItineraryDay } from "@/lib/post-types";

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

const QUICK_TIMES = ["Morning", "Afternoon", "Evening"] as const;

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyItinerary(): PostItinerary {
  return { enabled: false, title: "", intro: "", days: [] };
}

export function itineraryFromInitial(
  raw?: PostItinerary | null,
): PostItinerary {
  if (!raw) return emptyItinerary();
  return {
    enabled: Boolean(raw.enabled),
    title: raw.title ?? "",
    intro: raw.intro ?? "",
    days: Array.isArray(raw.days)
      ? raw.days.map((d, i) => ({
          id: d.id || newId("day"),
          label: d.label || `Day ${i + 1}`,
          title: d.title || "",
          summary: d.summary ?? "",
          blocks: Array.isArray(d.blocks)
            ? d.blocks.map((b) => ({
                id: b.id || newId("block"),
                time: b.time ?? "",
                place: b.place ?? "",
                body: b.body || "",
              }))
            : [],
        }))
      : [],
  };
}

type Props = {
  value: PostItinerary;
  onChange: (next: PostItinerary) => void;
};

export function ItineraryEditor({ value, onChange }: Props) {
  const set = (patch: Partial<PostItinerary>) =>
    onChange({ ...value, ...patch });

  const updateDay = (dayId: string, patch: Partial<PostItineraryDay>) => {
    set({
      days: value.days.map((d) => (d.id === dayId ? { ...d, ...patch } : d)),
    });
  };

  const moveDay = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= value.days.length) return;
    const days = [...value.days];
    const [row] = days.splice(index, 1);
    days.splice(next, 0, row);
    set({ days });
  };

  const addDay = () => {
    const n = value.days.length + 1;
    set({
      days: [
        ...value.days,
        {
          id: newId("day"),
          label: `Day ${n}`,
          title: "",
          summary: "",
          blocks: [
            {
              id: newId("block"),
              time: "Morning",
              place: "",
              body: "",
            },
          ],
        },
      ],
    });
  };

  const addBlock = (dayId: string, time?: string) => {
    set({
      days: value.days.map((d) =>
        d.id === dayId
          ? {
              ...d,
              blocks: [
                ...d.blocks,
                {
                  id: newId("block"),
                  time: time ?? "",
                  place: "",
                  body: "",
                },
              ],
            }
          : d,
      ),
    });
  };

  return (
    <section
      className="rounded-xl border border-border bg-surface-soft p-4 shadow-sm sm:p-5"
      aria-labelledby="trip-timeline-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="trip-timeline-heading"
            className="font-display text-sm font-bold uppercase tracking-wide text-heading"
          >
            Trip timeline
          </h2>
          <p className="mt-1 text-xs text-muted">
            Separate from the story above — day-by-day notes render as a
            timeline on the public post.
          </p>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-white px-3 py-3 text-sm transition hover:border-border-strong">
        <input
          type="checkbox"
          className="mt-0.5 size-4 rounded border-border text-accent focus:ring-accent/25"
          checked={value.enabled}
          onChange={(e) => {
            const enabled = e.target.checked;
            set({
              enabled,
              days:
                enabled && value.days.length === 0
                  ? [
                      {
                        id: newId("day"),
                        label: "Day 1",
                        title: "",
                        summary: "",
                        blocks: [
                          {
                            id: newId("block"),
                            time: "Morning",
                            place: "",
                            body: "",
                          },
                        ],
                      },
                    ]
                  : value.days,
            });
          }}
        />
        <span>
          <span className="font-semibold text-heading">
            This post includes a day-by-day itinerary
          </span>
          <span className="mt-0.5 block text-xs text-muted">
            Leave off for regular stories — nothing extra is saved.
          </span>
        </span>
      </label>

      {value.enabled ? (
        <div className="mt-5 space-y-5">
          <div>
            <label
              htmlFor="itin-title"
              className="text-sm font-semibold text-heading"
            >
              Itinerary title
            </label>
            <input
              id="itin-title"
              value={value.title ?? ""}
              onChange={(e) => set({ title: e.target.value })}
              placeholder='e.g. "2 days at Niagara Falls"'
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="itin-intro"
              className="text-sm font-semibold text-heading"
            >
              Intro
            </label>
            <textarea
              id="itin-intro"
              value={value.intro ?? ""}
              onChange={(e) => set({ intro: e.target.value })}
              rows={2}
              placeholder="Short personal blurb — when you went, the vibe…"
              className={areaClass}
            />
          </div>

          <div className="relative space-y-0 pl-2">
            <div
              className="absolute bottom-4 left-[1.35rem] top-4 w-px bg-border"
              aria-hidden="true"
            />

            {value.days.length === 0 ? (
              <p className="relative z-[1] py-4 text-xs text-muted">
                No days yet — add Day 1 to start.
              </p>
            ) : (
              value.days.map((day, dayIndex) => (
                <div
                  key={day.id}
                  className="relative z-[1] mb-4 flex gap-3 last:mb-0"
                >
                  <div className="flex w-8 shrink-0 flex-col items-center pt-3">
                    <span className="flex size-7 items-center justify-center rounded-full border border-accent/40 bg-white text-[0.65rem] font-bold text-accent-deep shadow-sm">
                      {dayIndex + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 rounded-lg border border-border bg-white p-3 shadow-sm sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Day {dayIndex + 1}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold text-muted hover:text-heading disabled:opacity-40"
                          disabled={dayIndex === 0}
                          onClick={() => moveDay(dayIndex, -1)}
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold text-muted hover:text-heading disabled:opacity-40"
                          disabled={dayIndex === value.days.length - 1}
                          onClick={() => moveDay(dayIndex, 1)}
                        >
                          Down
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold text-muted hover:text-red-700"
                          onClick={() =>
                            set({
                              days: value.days.filter((d) => d.id !== day.id),
                            })
                          }
                        >
                          Remove day
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-heading">
                          Label
                        </label>
                        <input
                          value={day.label}
                          onChange={(e) =>
                            updateDay(day.id, { label: e.target.value })
                          }
                          placeholder="Day 1"
                          className={`${fieldClass} mt-1 min-h-9`}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-heading">
                          Title
                        </label>
                        <input
                          value={day.title}
                          onChange={(e) =>
                            updateDay(day.id, { title: e.target.value })
                          }
                          placeholder="Arrival & the falls at dusk"
                          className={`${fieldClass} mt-1 min-h-9`}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-heading">
                        Summary{" "}
                        <span className="font-normal text-muted">(optional)</span>
                      </label>
                      <input
                        value={day.summary ?? ""}
                        onChange={(e) =>
                          updateDay(day.id, { summary: e.target.value })
                        }
                        placeholder="One-line overview of the day"
                        className={`${fieldClass} mt-1 min-h-9`}
                      />
                    </div>

                    <div className="space-y-2 border-t border-border pt-3">
                      <p className="text-xs font-semibold text-heading">
                        Time blocks
                      </p>
                      {day.blocks.map((block, blockIndex) => (
                        <div
                          key={block.id}
                          className="space-y-2 rounded-md border border-border/80 bg-surface-soft/50 p-2.5"
                        >
                          <div className="grid gap-2 sm:grid-cols-[7rem_1fr_auto]">
                            <input
                              aria-label={`Day ${dayIndex + 1} block ${blockIndex + 1} time`}
                              value={block.time ?? ""}
                              onChange={(e) =>
                                updateDay(day.id, {
                                  blocks: day.blocks.map((b) =>
                                    b.id === block.id
                                      ? { ...b, time: e.target.value }
                                      : b,
                                  ),
                                })
                              }
                              placeholder="Morning"
                              className={`${fieldClass} mt-0 min-h-9`}
                            />
                            <input
                              aria-label={`Day ${dayIndex + 1} block ${blockIndex + 1} place`}
                              value={block.place ?? ""}
                              onChange={(e) =>
                                updateDay(day.id, {
                                  blocks: day.blocks.map((b) =>
                                    b.id === block.id
                                      ? { ...b, place: e.target.value }
                                      : b,
                                  ),
                                })
                              }
                              placeholder="Place (optional)"
                              className={`${fieldClass} mt-0 min-h-9`}
                            />
                            <button
                              type="button"
                              className="rounded-md border border-border px-2 py-1 text-[0.65rem] font-semibold text-muted hover:text-red-700"
                              onClick={() =>
                                updateDay(day.id, {
                                  blocks: day.blocks.filter(
                                    (b) => b.id !== block.id,
                                  ),
                                })
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <textarea
                            aria-label={`Day ${dayIndex + 1} block ${blockIndex + 1} body`}
                            value={block.body}
                            onChange={(e) =>
                              updateDay(day.id, {
                                blocks: day.blocks.map((b) =>
                                  b.id === block.id
                                    ? { ...b, body: e.target.value }
                                    : b,
                                ),
                              })
                            }
                            rows={2}
                            placeholder="What you did…"
                            className={`${areaClass} mt-0`}
                          />
                        </div>
                      ))}

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {QUICK_TIMES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            className="rounded-full border border-border bg-white px-2.5 py-1 text-[0.65rem] font-semibold text-heading transition hover:border-accent/40 hover:bg-accent/5"
                            onClick={() => addBlock(day.id, t)}
                          >
                            + {t}
                          </button>
                        ))}
                        <button
                          type="button"
                          className="rounded-full border border-dashed border-border px-2.5 py-1 text-[0.65rem] font-semibold text-muted hover:text-heading"
                          onClick={() => addBlock(day.id)}
                        >
                          + Custom time
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            className="btn btn-secondary text-xs"
            onClick={addDay}
          >
            Add day
          </button>
        </div>
      ) : null}
    </section>
  );
}
