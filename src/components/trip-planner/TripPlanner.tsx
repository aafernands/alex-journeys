"use client";

const STEPS = [1, 2, 3, 4] as const;

/**
 * Planner shell for /guides/plan-a-trip.
 * Step copy and fields land in the next pass; this keeps the approved
 * panel + orange progress bar visible for preview.
 */
export function TripPlanner() {
  const step = 1;

  return (
    <section aria-labelledby="trip-planner-heading" className="mt-8 max-w-3xl">
      <div
        className="flex gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={4}
        aria-valuenow={step}
        aria-label={`Step ${step} of 4`}
      >
        {STEPS.map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full ${
              n <= step ? "bg-accent" : "bg-sand"
            }`}
          />
        ))}
      </div>

      <div className="panel mt-6 p-6 md:p-8">
        <h2
          id="trip-planner-heading"
          className="font-display text-2xl font-bold tracking-tight text-heading"
        >
          What do you want to book?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
          Pick one or combine them. I’ll give you next steps with the tools I
          actually use.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {["Flights", "Hotel or stay", "Car rental"].map((label) => (
            <span
              key={label}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-white px-4 text-sm font-semibold text-heading"
            >
              {label}
            </span>
          ))}
          <span className="inline-flex min-h-11 items-center rounded-full border border-dashed border-border-strong bg-white px-4 text-sm font-semibold text-muted">
            Not sure yet — help me plan
          </span>
        </div>
        <div className="mt-8 flex justify-end">
          <span className="btn btn-primary">Continue</span>
        </div>
      </div>
    </section>
  );
}
