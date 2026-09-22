"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { DateRangeField } from "@/components/trip-planner/DateRangeField";
import { plan as tripDensity } from "@/components/trip-planner/density";
import { ItineraryHub } from "@/components/trip-planner/ItineraryHub";
import { PlaceCombobox } from "@/components/trip-planner/PlaceCombobox";
import { useTripSync } from "@/components/trip-planner/useTripSync";
import {
  dateSummary,
  effectiveCategories,
  initialPlannerState,
  nextStepsSubhead,
  reviewRows,
  travelerSummary,
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
  clearGuestSaveFlags,
  clearGuestBackup,
  getActivePlanSnapshot,
  getServerActivePlan,
  isPendingPlan,
  subscribeTripStore,
  writeActivePlan,
  type PendingPlan,
  type StoredPlan,
} from "@/lib/trip-planner-storage";
import type { JournalNote, JournalPlace } from "@/lib/trip-journal";
import {
  decodeSharedPlan,
  planATripHref,
  planATripLoginHref,
  shouldPromptTripSignIn,
  TRIPS_ACCOUNT_UNAVAILABLE,
} from "@/lib/trip-record";

const EMPTY_PLAN: StoredPlan = {
  step: 1,
  state: initialPlannerState(),
  items: [],
  tripId: null,
  packingNotes: "",
};

type Props = {
  config: TripPlannerConfig;
  partners: TripPlannerPartner[];
  journalPlaces: readonly string[];
  journalNotes?: readonly JournalNote[];
  journalPlaceIndex?: readonly JournalPlace[];
  urlTripId?: string | null;
  /** Open the hotel lane after a stay was booked on /stays. */
  focusStay?: boolean;
  /** Open the flight lane after a flight was booked on /flights. */
  focusFlight?: boolean;
};

const STEPS = [1, 2, 3, 4] as const;
type Step = (typeof STEPS)[number];

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
      className={`${tripDensity.chip} ${
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
      className={`${tripDensity.chip} ${
        pressed
          ? "border-ink bg-ink text-on-solid"
          : "border-border bg-white text-text hover:border-border-strong"
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
    <div className="plan-field">
      <label htmlFor={htmlFor} className={tripDensity.label}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className={tripDensity.error}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, error?: string): string | undefined {
  return error ? `${id}-error` : undefined;
}

function StepMeter({ step, className }: { step: number; className?: string }) {
  return (
    <div className={className}>
      <div
        className="flex gap-2"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
        aria-label={`Step ${step} of 3`}
      >
        {STEPS.filter((n) => n < 4).map((n) => (
          <span
            key={n}
            className={`h-1 flex-1 rounded-full ${n <= step ? "bg-accent" : "bg-sand"}`}
          />
        ))}
      </div>
    </div>
  );
}

function StepHeading({
  id,
  title,
  step,
  lead,
  status,
}: {
  id: string;
  title: string;
  step: Step;
  lead?: string;
  status?: string;
}) {
  return (
    <div className="plan-stack-tight">
      <h2 id={id} className={tripDensity.h2}>
        {lead ? <span className="plan-mobile-only">{lead}</span> : null}
        <span className={lead ? "plan-desktop-only" : undefined}>{title}</span>
      </h2>
      {lead && status ? (
        <p className={`${tripDensity.caption} text-muted plan-mobile-only`}>
          {status} · Step {step} of 3
        </p>
      ) : null}
      {lead ? (
        <p className="plan-step-title font-display text-heading plan-mobile-only">{title}</p>
      ) : null}
      <StepMeter step={step} className="plan-mobile-only" />
    </div>
  );
}

function PlannerShell() {
  return (
    <section className="plan-trip plan-block max-w-3xl" aria-hidden="true">
      <div className="h-1 rounded-full bg-sand" />
      <div className={`${tripDensity.panel} plan-section h-48`} />
    </section>
  );
}

export function TripPlanner({
  config,
  partners,
  journalPlaces,
  journalNotes = [],
  journalPlaceIndex = [],
  urlTripId = null,
  focusStay = false,
  focusFlight = false,
}: Props) {
  const baseId = useId();
  const storedPlan = useSyncExternalStore<StoredPlan | null | PendingPlan>(
    subscribeTripStore,
    getActivePlanSnapshot,
    getServerActivePlan,
  );
  const plan: StoredPlan = isPendingPlan(storedPlan)
    ? EMPTY_PLAN
    : (storedPlan ?? EMPTY_PLAN);
  const { step, state } = plan;
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});

  const cats = effectiveCategories(state);
  const flexibleOn = config.flexibleDates;
  const dateMode = flexibleOn ? state.dateMode : "exact";
  const sync = useTripSync({
    plan,
    flexibleOn,
    urlTripId,
  });
  const sharedHashApplied = useRef(false);

  useEffect(() => {
    if (sharedHashApplied.current || isPendingPlan(storedPlan)) return;
    const prefix = "#itinerary=";
    const hash = window.location.hash;
    if (!hash.startsWith(prefix)) return;
    sharedHashApplied.current = true;
    const shared = decodeSharedPlan(decodeURIComponent(hash.slice(prefix.length)));
    if (!shared) return;
    writeActivePlan(shared);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }, [storedPlan]);

  function savePlan(next: {
    step: Step;
    state: PlannerState;
    items?: StoredPlan["items"];
    tripId?: string | null;
    packingNotes?: string;
    title?: string;
    titleCustom?: boolean;
  }) {
    writeActivePlan({
      step: next.step,
      state: next.state,
      items: next.items ?? plan.items,
      tripId: next.tripId !== undefined ? next.tripId : plan.tripId,
      packingNotes:
        next.packingNotes !== undefined ? next.packingNotes : plan.packingNotes,
      title: next.title !== undefined ? next.title : plan.title,
      titleCustom:
        next.titleCustom !== undefined ? next.titleCustom : plan.titleCustom,
    });
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

  function startOver() {
    sync.dismissUrlTrip();
    clearGuestBackup();
    clearGuestSaveFlags();
    writeActivePlan({
      step: 1,
      state: initialPlannerState(),
      items: [],
      tripId: null,
      packingNotes: "",
      title: "",
      titleCustom: false,
    });
    setCategoryError(null);
    setErrors({});
  }

  const rows = reviewRows(state, flexibleOn);
  const steps = visiblePartners(partners, state, config.extras);
  const subhead = nextStepsSubhead(config.steps.next.helper, state, flexibleOn);
  const tripName = state.destination.trim();
  const tripStatus = [
    dateSummary(state, flexibleOn) || "Dates not set",
    travelerSummary(state),
  ].join(" · ");

  if (isPendingPlan(storedPlan)) {
    return <PlannerShell />;
  }

  if (urlTripId && (sync.authLoading || (sync.signedIn && sync.remote === "loading"))) {
    return <PlannerShell />;
  }

  if (
    shouldPromptTripSignIn({
      urlTripId,
      signedIn: sync.signedIn,
      authLoading: sync.authLoading,
      planTripId: plan.tripId,
    })
  ) {
    const hasLocalDraft = Boolean(plan.state.destination.trim());
    return (
      <section className="plan-trip plan-block max-w-3xl" aria-labelledby={`${baseId}-heading`}>
        <div className={tripDensity.panel}>
          <h2
            id={`${baseId}-heading`}
            className={tripDensity.h2}
          >
            {config.steps.next.heading}
          </h2>
          <p className={`${tripDensity.prose} plan-follow text-text`}>
            Sign in to open this saved itinerary. You’ll come back to this trip
            after you continue.
          </p>
          <div className="plan-actions">
            <Link href={planATripLoginHref(urlTripId, "signin")} className="btn btn-ink">
              Sign in
            </Link>
            <Link
              href={planATripLoginHref(urlTripId, "signup")}
              className="btn btn-secondary"
            >
              Create account
            </Link>
            {hasLocalDraft ? (
              <Link href={planATripHref()} className="btn btn-secondary">
                Use the draft in this browser
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    );
  }

  if (urlTripId && sync.signedIn && sync.remote === "missing") {
    return (
      <section className="plan-trip plan-block max-w-3xl" aria-labelledby={`${baseId}-heading`}>
        <div className={tripDensity.panel}>
          <h2
            id={`${baseId}-heading`}
            className={tripDensity.h2}
          >
            That trip isn’t on this account.
          </h2>
          <button
            type="button"
            className="btn btn-primary plan-section"
            onClick={() => sync.dismissUrlTrip()}
          >
            Continue in this browser
          </button>
        </div>
      </section>
    );
  }

  if (
    urlTripId &&
    sync.signedIn &&
    (sync.remote === "error" || sync.remote === "unavailable") &&
    plan.tripId !== urlTripId
  ) {
    return (
      <section className="plan-trip plan-block max-w-3xl" aria-labelledby={`${baseId}-heading`}>
        <div className={tripDensity.panel}>
          <h2
            id={`${baseId}-heading`}
            className={tripDensity.h2}
          >
            {sync.remote === "unavailable"
              ? "Saved trips aren’t available right now"
              : "Couldn’t open that trip"}
          </h2>
          <p className={`${tripDensity.prose} plan-follow text-text`} role="status">
            {sync.remote === "unavailable"
              ? TRIPS_ACCOUNT_UNAVAILABLE
              : "Something went wrong opening that trip. You can still plan in this browser."}
          </p>
          <button
            type="button"
            className="btn btn-secondary plan-section"
            onClick={() => sync.dismissUrlTrip()}
          >
            Continue in this browser
          </button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby={`${baseId}-heading`} className="plan-trip plan-block max-w-3xl">
      {step < 4 ? (
        <div className="plan-desktop-only">
          <p className={`${tripDensity.caption} font-semibold text-muted`}>
            Step {step} of 3
          </p>
          <StepMeter step={step} className="mt-2" />
        </div>
      ) : null}

      <div className={`${tripDensity.panel} plan-section`}>
        {step === 1 ? (
          <>
            <StepHeading
              id={`${baseId}-heading`}
              title={config.steps.categories.heading}
              step={1}
            />
            <p className={`${tripDensity.prose} plan-follow text-muted plan-desktop-only`}>
              {config.steps.categories.helper}
            </p>
            <div
              className="plan-section flex flex-wrap gap-2"
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
              <p className={`${tripDensity.error} plan-follow`} role="alert">
                {categoryError}
              </p>
            ) : null}
            <div className="plan-actions plan-actions-end plan-sticky plan-sticky-solo">
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
            <StepHeading
              id={`${baseId}-heading`}
              title={config.steps.details.heading}
              step={2}
              lead={tripName || undefined}
              status={tripName ? tripStatus : undefined}
            />
            <p className={`${tripDensity.prose} plan-follow text-muted plan-desktop-only`}>
              {config.steps.details.helper}
            </p>

            <div className="plan-form">
              <Field
                label="Where are you going?"
                htmlFor={`${baseId}-destination`}
                error={errors.destination}
              >
                <PlaceCombobox
                  id={`${baseId}-destination`}
                  className={tripDensity.input}
                  value={state.destination}
                  journalLabels={journalPlaces}
                  listLabel="Destinations"
                  invalid={Boolean(errors.destination)}
                  describedBy={describedBy(
                    `${baseId}-destination`,
                    errors.destination,
                  )}
                  onChange={(destination) => patch({ destination })}
                />
              </Field>

              <div className="plan-group">
                <p className={tripDensity.label}>Dates</p>
                {flexibleOn ? (
                  <div className="flex flex-wrap gap-2">
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
                  <DateRangeField
                    id={`${baseId}-dates`}
                    startDate={state.startDate}
                    endDate={state.endDate}
                    startLabel="Start"
                    endLabel="End"
                    dialogLabel="Trip dates"
                    startError={errors.startDate}
                    endError={errors.endDate}
                    onChange={(next) => patch(next)}
                  />
                ) : (
                  <div className="plan-pair">
                    <Field
                      label="Month"
                      htmlFor={`${baseId}-month`}
                      error={errors.month}
                    >
                      <input
                        id={`${baseId}-month`}
                        type="month"
                        className={tripDensity.input}
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
                        className={tripDensity.input}
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

              <div className="plan-pair">
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
                    className={tripDensity.input}
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
                    className={tripDensity.input}
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
                    <PlaceCombobox
                      id={`${baseId}-origin`}
                      className={tripDensity.input}
                      value={state.origin}
                      journalLabels={journalPlaces}
                      listLabel="Departure cities"
                      invalid={Boolean(errors.origin)}
                      describedBy={describedBy(
                        `${baseId}-origin`,
                        errors.origin,
                      )}
                      onChange={(origin) => patch({ origin })}
                    />
                  </Field>
                  <div className="plan-group">
                    <p className={tripDensity.label}>Trip type</p>
                    <div className="flex flex-wrap gap-2">
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
                        className={`${tripDensity.input} plan-input-short`}
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
                <div className="plan-stack-tight">
                  <label className={tripDensity.check}>
                    <input
                      type="checkbox"
                      className={tripDensity.checkInput}
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
                        className={tripDensity.input}
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
                  <label className={tripDensity.check}>
                    <input
                      type="checkbox"
                      className={tripDensity.checkInput}
                      checked={state.carDatesSameAsTrip}
                      onChange={(event) =>
                        patch({ carDatesSameAsTrip: event.target.checked })
                      }
                    />
                    Same dates as the trip
                  </label>
                  {state.carDatesSameAsTrip ? null : (
                    <DateRangeField
                      id={`${baseId}-car-dates`}
                      startDate={state.carPickupDate}
                      endDate={state.carDropoffDate}
                      startLabel="Pickup"
                      endLabel="Drop-off"
                      dialogLabel="Car dates"
                      startError={errors.carPickupDate}
                      endError={errors.carDropoffDate}
                      onChange={(next) =>
                        patch({
                          carPickupDate: next.startDate,
                          carDropoffDate: next.endDate,
                        })
                      }
                    />
                  )}
                </div>
              ) : null}
            </div>

            <div className="plan-actions plan-sticky">
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
            <StepHeading
              id={`${baseId}-heading`}
              title={config.steps.review.heading}
              step={3}
              lead={tripName || undefined}
              status={tripName ? tripStatus : undefined}
            />
            <p className={`${tripDensity.prose} plan-follow text-muted plan-desktop-only`}>
              {config.steps.review.helper}
            </p>
            <dl className="plan-section">
              {rows.map((row) => (
                <div key={row.label} className="plan-review-row">
                  <dt className={`${tripDensity.caption} font-semibold text-muted`}>
                    {row.label}
                  </dt>
                  <dd className={`${tripDensity.body} font-semibold text-heading sm:text-right`}>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            <div className="plan-actions plan-sticky">
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
          steps.length > 0 ? (
            <ItineraryHub
              headingId={`${baseId}-heading`}
              config={config}
              partners={steps}
              state={state}
              items={plan.items}
              flexibleOn={flexibleOn}
              subhead={subhead}
              tripId={plan.tripId}
              focusStay={focusStay}
              focusFlight={focusFlight}
              tripTitle={plan.titleCustom ? plan.title : undefined}
              saveMode={sync.mode}
              saveDetail={sync.saveDetail}
              guestBackup={sync.guestBackup}
              journalNotes={journalNotes}
              journalPlaceIndex={journalPlaceIndex}
              packingNotes={plan.packingNotes}
              onItemsChange={(items) => savePlan({ step, state, items })}
              onPackingNotesChange={(packingNotes) =>
                savePlan({ step, state, packingNotes })
              }
              onEditTrip={() => setStep(2)}
              onStartOver={startOver}
              onSaveToAccount={sync.saveToAccount}
              onDeclineMerge={sync.declineMerge}
              onRetrySave={sync.retrySave}
              onRestoreBackup={sync.restoreGuestBackup}
              onRememberGuestDraft={sync.rememberGuestDraft}
            />
          ) : (
            <>
              <h2
                id={`${baseId}-heading`}
                className={tripDensity.h2}
              >
                {config.steps.next.heading}
              </h2>
              <p className={`${tripDensity.prose} plan-section text-muted`}>
                No booking lanes are turned on for this trip yet.
              </p>
              <div className="plan-actions">
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
          )
        ) : null}
      </div>
    </section>
  );
}
