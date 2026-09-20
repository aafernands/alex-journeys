import type { PostItinerary } from "@/lib/post-types";

type Props = {
  itinerary: PostItinerary;
};

export function PostItineraryTimeline({ itinerary }: Props) {
  if (!itinerary.enabled || !itinerary.days?.length) return null;

  const heading = itinerary.title?.trim() || "Itinerary";
  const intro = itinerary.intro?.trim();

  return (
    <section
      className="mt-12 md:mt-14"
      aria-labelledby="post-itinerary-heading"
    >
      <div className="panel-soft overflow-hidden p-5 shadow-sm sm:p-7">
        <p className="eyebrow">From the trip</p>
        <h2
          id="post-itinerary-heading"
          className="font-display mt-1 text-xl font-semibold text-heading sm:text-2xl"
        >
          {heading}
        </h2>
        {intro ? (
          <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-text sm:text-base">
            {intro}
          </p>
        ) : null}

        <ol className="relative mt-8 space-y-0 pl-1">
          <div
            className="absolute bottom-2 left-[1.15rem] top-2 w-px bg-border sm:left-[1.35rem]"
            aria-hidden="true"
          />

          {itinerary.days.map((day, dayIndex) => (
            <li
              key={day.id}
              className="relative flex gap-3 pb-8 last:pb-0 sm:gap-5"
            >
              <div className="relative z-[1] flex w-9 shrink-0 flex-col items-center sm:w-11">
                <span
                  className="flex size-8 items-center justify-center rounded-full border border-accent/40 bg-white text-xs font-bold text-accent-deep shadow-sm sm:size-9 dark:bg-[var(--white)]"
                  aria-hidden="true"
                >
                  {dayIndex + 1}
                </span>
              </div>

              <div className="min-w-0 flex-1 rounded-lg border border-border bg-white p-4 shadow-sm sm:p-5 dark:bg-[var(--white)]">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">
                  {day.label}
                </p>
                <h3 className="font-display mt-1 text-lg font-semibold leading-snug text-heading sm:text-xl">
                  {day.title}
                </h3>
                {day.summary?.trim() ? (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">
                    {day.summary.trim()}
                  </p>
                ) : null}

                {day.blocks.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {day.blocks.map((block) => (
                      <li
                        key={block.id}
                        className="border-t border-border/70 pt-3 first:border-t-0 first:pt-0"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {block.time?.trim() ? (
                            <span className="inline-flex items-center rounded-full border border-accent/25 bg-accent/10 px-2.5 py-0.5 text-[0.7rem] font-semibold text-accent-deep dark:text-accent">
                              {block.time.trim()}
                            </span>
                          ) : null}
                          {block.place?.trim() ? (
                            <span className="text-xs font-medium text-muted">
                              {block.place.trim()}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-[0.95rem] leading-relaxed text-text whitespace-pre-wrap">
                          {block.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
