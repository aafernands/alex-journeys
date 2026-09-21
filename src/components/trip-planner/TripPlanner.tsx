"use client";

import { useId, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import {
  effectiveCategories,
  initialPlannerState,
  nextStepsSubhead,
  partnerUrlValues,
  planFingerprint,
  resolveAffiliateHref,
  reviewRows,
  TRIP_CATEGORIES,
  validateCategories,
  validateDetails,
  visiblePartners,
  type FieldErrors,
  type PlannerState,
  type TripCategory,
  type TripPlannerConfig,
  type TripPlannerPartner,
  type TripType,
} from "@/lib/trip-planner-model";
import {
  checksForFingerprint,
  getActivePlanSnapshot,
  getChecksRaw,
  getServerActivePlan,
  getServerChecksRaw,
  subscribeTripStore,
  writeActivePlan,
  writeChecks,
  type StoredPlan,
} from "@/lib/trip-planner-storage";

const EMPTY_PLAN: StoredPlan = { step: 1, state: initialPlannerState() };

type Props = {
  config: TripPlannerConfig;
  partners: TripPlannerPartner[];
};

const STEPS = [1, 2, 3, 4] as const;
type Step = (typeof STEPS)[number];

const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

function Chip({
  pressed,
  dashed,
  children,
  onClick,
}: {
  pressed: boolean;
  dashed?: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
        pressed
          ? dashed
            ? "border-dashed border-accent bg-accent/10 text-accent"
            : "border-accent bg-accent/10 text-accent"
          : dashed
            ? "border-dashed border-border-strong bg-white text-muted hover:border-accent hover:text-heading"
            : "border-border bg-white text-heading hover:border-border-strong"
      }`}
    >
      {children}
    </button>
  );
}

function Pill({
  pressed,
  children,
  onClick,
}: {
  pressed: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-semibold transition ${
        pressed
          ? "bg-ink text-on-solid"
          : "border border-border bg-white text-text hover:border-border-strong"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-[0.08em] text-muted"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1 text-sm text-link">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string): string | undefined {
  return error ? `${id}-error` : undefined;
}

export function TripPlanner({ config, partners }: Props) {
  const baseId = useId();
  const storedPlan = useSyncExternalStore(
    subscribeTripStore,
    getActivePlanSnapshot,
    getServerActivePlan,
  );
  const checksRaw = useSyncExternalStore(
    subscribeTripStore,
    getChecksRaw,
    getServerChecksRaw,
  );
  const plan = storedPlan ?? EMPTY_PLAN;
  const { step, state } = plan;
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const cats = effectiveCategories(state);
  const flexibleOn = config.flexibleDates;
  const dateMode = flexibleOn ? state.dateMode : "exact";
  const fingerprint = planFingerprint(state, flexibleOn);
  const checked = checksForFingerprint(checksRaw, fingerprint);

  function savePlan(next: StoredPlan) {
    writeActivePlan(next);
  }

  function patch(partial: Partial<PlannerState>) {
    savePlan({ step, state: { ...state, ...partial } });
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(partial)) delete next[key];
      return next;
    });
  }

  function setStep(next: Step) {
    savePlan({ step: next, state });
  }

  function toggleCategory(cat: TripCategory) {
    setCategoryError(null);
    if (state.unsure) {
      savePlan({
        step,
        state: {
          ...state,
          unsure: false,
          categories: TRIP_CATEGORIES.filter((item) => item !== cat),
        },
      });
      return;
    }
    const has = state.categories.includes(cat);
    savePlan({
      step,
      state: {
        ...state,
        categories: has
          ? state.categories.filter((item) => item !== cat)
          : [...state.categories, cat],
      },
    });
  }

  function toggleUnsure() {
    setCategoryError(null);
    savePlan({ step, state: { ...state, unsure: !state.unsure } });
  }

  function goDetails() {
    const message = validateCategories(state);
    setCategoryError(message);
    if (message) return;
    setErrors({});
    setStep(2);
  }

  function goReview() {
    const nextErrors = validateDetails(state, flexibleOn);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setStep(3);
  }

  function toggleDone(key: string) {
    const next = checked.includes(key)
      ? checked.filter((item) => item !== key)
      : [...checked, key];
    writeChecks(fingerprint, next);
  }

  function startOver() {
    writeChecks(fingerprint, []);
    writeActivePlan({ step: 1, state: initialPlannerState() });
    setCategoryError(null);
    setErrors({});
  }

  const rows = reviewRows(state, flexibleOn);
  const steps = visiblePartners(partners, state, config.extras);
  const subhead = nextStepsSubhead(config.steps.next.helper, state, flexibleOn);
  const doneCount = steps.filter((partner) => checked.includes(partner.key)).length;

  return (
    <section aria-labelledby={`${baseId}-heading`} className="mt-8 max-w-3xl">
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
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-accent" : "bg-sand"}`}
          />
        ))}
      </div>

      <div className="panel mt-6 p-6 md:p-8">
        {step === 1 ? (
          <>
            <h2
              id={`${baseId}-heading`}
              className="font-display text-2xl font-bold tracking-tight text-heading"
            >
              {config.steps.categories.heading}
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted md:text-base">
              {config.steps.categories.helper}
            </p>
            <div
              className="mt-6 flex flex-wrap gap-2"
              role="group"
              aria-label={config.steps.categories.heading}
            >
              {TRIP_CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  pressed={cats.includes(cat)}
                  onClick={() => toggleCategory(cat)}
                >
                  {config.chips[cat]}
                </Chip>
              ))}
              <Chip pressed={state.unsure} dashed onClick={toggleUnsure}>
                {config.chips.unsure}
              </Chip>
            </div>
            {categoryError ? (
              <p className="mt-3 text-sm text-link" role="alert">
                {categoryError}
              </p>
            ) : null}
            <div className="mt-8 flex justify-end">
              <button type="button" className="btn btn-primary" onClick={goDetails}>
                {config.continueLabel}
              </button>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              goReview();
            }}
          >
            <h2
              id={`${baseId}-heading`}
              className="font-display text-2xl font-bold tracking-tight text-heading"
            >
              {config.steps.details.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
              {config.steps.details.helper}
            </p>

            <div className="mt-6 space-y-5">
              <Field
                label="Where are you going?"
                htmlFor={`${baseId}-destination`}
                error={errors.destination}
              >
                <input
                  id={`${baseId}-destination`}
                  className={inputClass}
                  value={state.destination}
                  aria-invalid={Boolean(errors.destination)}
                  aria-describedby={describedBy(
                    `${baseId}-destination`,
                    errors.destination,
                  )}
                  autoComplete="off"
                  onChange={(event) =>
                    patch({ destination: event.target.value })
                  }
                />
              </Field>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  Dates
                </p>
                {flexibleOn ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill
                      pressed={dateMode === "exact"}
                      onClick={() => patch({ dateMode: "exact" })}
                    >
                      Exact
                    </Pill>
                    <Pill
                      pressed={dateMode === "flexible"}
                      onClick={() => patch({ dateMode: "flexible" })}
                    >
                      Flexible
                    </Pill>
                  </div>
                ) : null}

                {dateMode === "exact" ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor={`${baseId}-start`} className="sr-only">
                        Start date
                      </label>
                      <input
                        id={`${baseId}-start`}
                        type="date"
                        className={inputClass}
                        value={state.startDate}
                        aria-invalid={Boolean(errors.startDate)}
                        aria-describedby={describedBy(
                          `${baseId}-start`,
                          errors.startDate,
                        )}
                        onChange={(event) =>
                          patch({ startDate: event.target.value })
                        }
                      />
                      {errors.startDate ? (
                        <p id={`${baseId}-start-error`} className="mt-1 text-sm text-link">
                          {errors.startDate}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor={`${baseId}-end`} className="sr-only">
                        End date
                      </label>
                      <input
                        id={`${baseId}-end`}
                        type="date"
                        className={inputClass}
                        value={state.endDate}
                        aria-invalid={Boolean(errors.endDate)}
                        aria-describedby={describedBy(
                          `${baseId}-end`,
                          errors.endDate,
                        )}
                        onChange={(event) =>
                          patch({ endDate: event.target.value })
                        }
                      />
                      {errors.endDate ? (
                        <p id={`${baseId}-end-error`} className="mt-1 text-sm text-link">
                          {errors.endDate}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field
                      label="Month"
                      htmlFor={`${baseId}-month`}
                      error={errors.month}
                    >
                      <input
                        id={`${baseId}-month`}
                        type="month"
                        className={inputClass}
                        value={state.month}
                        aria-invalid={Boolean(errors.month)}
                        aria-describedby={describedBy(
                          `${baseId}-month`,
                          errors.month,
                        )}
                        onChange={(event) => patch({ month: event.target.value })}
                      />
                    </Field>
                    <Field
                      label="Nights"
                      htmlFor={`${baseId}-nights`}
                      error={errors.nights}
                    >
                      <input
                        id={`${baseId}-nights`}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        className={inputClass}
                        value={state.nights}
                        aria-invalid={Boolean(errors.nights)}
                        aria-describedby={describedBy(
                          `${baseId}-nights`,
                          errors.nights,
                        )}
                        onChange={(event) =>
                          patch({
                            nights: event.target.valueAsNumber,
                          })
                        }
                      />
                    </Field>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Adults"
                  htmlFor={`${baseId}-adults`}
                  error={errors.adults}
                >
                  <input
                    id={`${baseId}-adults`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className={inputClass}
                    value={state.adults}
                    aria-invalid={Boolean(errors.adults)}
                    aria-describedby={describedBy(
                      `${baseId}-adults`,
                      errors.adults,
                    )}
                    onChange={(event) =>
                      patch({ adults: event.target.valueAsNumber })
                    }
                  />
                </Field>
                <Field
                  label="Children"
                  htmlFor={`${baseId}-children`}
                  error={errors.children}
                >
                  <input
                    id={`${baseId}-children`}
                    type="number"
                    min={0}
                    inputMode="numeric"
                    className={inputClass}
                    value={state.children}
                    aria-invalid={Boolean(errors.children)}
                    aria-describedby={describedBy(
                      `${baseId}-children`,
                      errors.children,
                    )}
                    onChange={(event) =>
                      patch({ children: event.target.valueAsNumber })
                    }
                  />
                </Field>
              </div>

              {cats.includes("flights") ? (
                <>
                  <Field
                    label="Flying from"
                    htmlFor={`${baseId}-origin`}
                    error={errors.origin}
                  >
                    <input
                      id={`${baseId}-origin`}
                      className={inputClass}
                      value={state.origin}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.origin)}
                      aria-describedby={describedBy(
                        `${baseId}-origin`,
                        errors.origin,
                      )}
                      onChange={(event) => patch({ origin: event.target.value })}
                    />
                  </Field>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                      Trip type
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        [
                          ["roundtrip", "Round-trip"],
                          ["oneway", "One-way"],
                        ] as const
                      ).map(([value, label]) => (
                        <Pill
                          key={value}
                          pressed={state.tripType === value}
                          onClick={() => patch({ tripType: value satisfies TripType })}
                        >
                          {label}
                        </Pill>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}

              {cats.includes("hotel") ? (
                <Field
                  label="Rooms"
                  htmlFor={`${baseId}-rooms`}
                  error={errors.rooms}
                >
                  <input
                    id={`${baseId}-rooms`}
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className={`${inputClass} max-w-[7.5rem]`}
                    value={state.rooms}
                    aria-invalid={Boolean(errors.rooms)}
                    aria-describedby={describedBy(`${baseId}-rooms`, errors.rooms)}
                    onChange={(event) =>
                      patch({ rooms: event.target.valueAsNumber })
                    }
                  />
                </Field>
              ) : null}

              {cats.includes("car") ? (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-semibold text-heading">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--accent)]"
                      checked={state.carPickupSameAsDestination}
                      onChange={(event) =>
                        patch({
                          carPickupSameAsDestination: event.target.checked,
                        })
                      }
                    />
                    Pick up at the destination
                  </label>
                  {state.carPickupSameAsDestination ? null : (
                    <Field
                      label="Pickup location"
                      htmlFor={`${baseId}-pickup`}
                      error={errors.carPickupLocation}
                    >
                      <input
                        id={`${baseId}-pickup`}
                        className={inputClass}
                        value={state.carPickupLocation}
                        aria-invalid={Boolean(errors.carPickupLocation)}
                        aria-describedby={describedBy(
                          `${baseId}-pickup`,
                          errors.carPickupLocation,
                        )}
                        onChange={(event) =>
                          patch({ carPickupLocation: event.target.value })
                        }
                      />
                    </Field>
                  )}
                  <label className="flex items-center gap-2 text-sm font-semibold text-heading">
                    <input
                      type="checkbox"
                      className="size-4 accent-[var(--accent)]"
                      checked={state.carDatesSameAsTrip}
                      onChange={(event) =>
                        patch({ carDatesSameAsTrip: event.target.checked })
                      }
                    />
                    Same dates as the trip
                  </label>
                  {state.carDatesSameAsTrip ? null : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Pickup date"
                        htmlFor={`${baseId}-car-start`}
                        error={errors.carPickupDate}
                      >
                        <input
                          id={`${baseId}-car-start`}
                          type="date"
                          className={inputClass}
                          value={state.carPickupDate}
                          aria-invalid={Boolean(errors.carPickupDate)}
                          aria-describedby={describedBy(
                            `${baseId}-car-start`,
                            errors.carPickupDate,
                          )}
                          onChange={(event) =>
                            patch({ carPickupDate: event.target.value })
                          }
                        />
                      </Field>
                      <Field
                        label="Drop-off date"
                        htmlFor={`${baseId}-car-end`}
                        error={errors.carDropoffDate}
                      >
                        <input
                          id={`${baseId}-car-end`}
                          type="date"
                          className={inputClass}
                          value={state.carDropoffDate}
                          aria-invalid={Boolean(errors.carDropoffDate)}
                          aria-describedby={describedBy(
                            `${baseId}-car-end`,
                            errors.carDropoffDate,
                          )}
                          onChange={(event) =>
                            patch({ carDropoffDate: event.target.value })
                          }
                        />
                      </Field>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
              >
                {config.backLabel}
              </button>
              <button type="submit" className="btn btn-primary">
                {config.continueLabel}
              </button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <>
            <h2
              id={`${baseId}-heading`}
              className="font-display text-2xl font-bold tracking-tight text-heading"
            >
              {config.steps.review.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
              {config.steps.review.helper}
            </p>
            <dl className="mt-6">
              {rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-baseline justify-between gap-4 border-b border-border py-3 text-sm"
                >
                  <dt className="text-muted">{row.label}</dt>
                  <dd className="text-right font-semibold text-heading">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
              >
                {config.editLabel}
              </button>
              <button
                type="button"
                className="btn btn-ink"
                onClick={() => setStep(4)}
              >
                {config.getStepsLabel}
              </button>
            </div>
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2
              id={`${baseId}-heading`}
              className="font-display text-2xl font-bold tracking-tight text-heading"
            >
              {config.steps.next.heading}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
              {subhead}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text">
              {config.checklistHint}
            </p>
            {steps.length > 0 ? (
              <p className="mt-1 text-sm font-semibold text-muted">
                {doneCount} of {steps.length} done
              </p>
            ) : null}
            {steps.length > 0 ? (
              <ol className="mt-4 space-y-3">
                {steps.map((partner, index) => {
                  const href = resolveAffiliateHref(
                    partner,
                    partnerUrlValues(partner, state, flexibleOn),
                  );
                  const done = checked.includes(partner.key);
                  const checkId = `${baseId}-done-${partner.key}`;
                  return (
                    <li
                      key={partner.key}
                      className={`flex flex-col gap-4 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between ${
                        partner.isCore ? "bg-surface-soft" : "bg-white"
                      }`}
                    >
                      <div className="flex min-w-0 gap-3">
                        <input
                          id={checkId}
                          type="checkbox"
                          className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                          checked={done}
                          onChange={() => toggleDone(partner.key)}
                        />
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            partner.isCore
                              ? "bg-ink text-on-solid"
                              : "bg-surface text-muted"
                          }`}
                          aria-hidden="true"
                        >
                          {index + 1}
                        </span>
                        <label htmlFor={checkId} className="min-w-0 cursor-pointer">
                          <span
                            className={`font-display block font-bold ${
                              done ? "text-muted line-through" : "text-heading"
                            }`}
                          >
                            {partner.label}
                          </span>
                          {partner.blurb ? (
                            <span className="mt-0.5 block text-sm leading-relaxed text-muted">
                              {partner.blurb}
                            </span>
                          ) : null}
                        </label>
                      </div>
                      <OutboundLink
                        href={href}
                        affiliate
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className={`btn w-full shrink-0 sm:w-auto ${
                          partner.isCore ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {partner.buttonLabel}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </OutboundLink>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="mt-6 text-sm text-muted">
                No next steps are turned on for this trip yet.
              </p>
            )}
            <aside className="panel-soft mt-4 px-4 py-3" aria-label="Affiliate disclosure">
              <p className="text-sm leading-relaxed text-text">
                {config.disclosure}{" "}
                <Link
                  href="/affiliate-disclosure"
                  className="text-link hover:text-accent"
                >
                  Read the full disclosure
                </Link>
                .
              </p>
            </aside>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
              >
                {config.editDetailsLabel}
              </button>
              <button type="button" className="btn btn-secondary" onClick={startOver}>
                {config.startOverLabel}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
