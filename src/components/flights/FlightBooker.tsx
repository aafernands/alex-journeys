"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { FlightCardPayment } from "@/components/flights/FlightCardPayment";
import { FlightConfirmationScreen } from "@/components/flights/FlightConfirmationScreen";
import { FlightFailureNotice } from "@/components/flights/FlightFailureNotice";
import { plan } from "@/components/trip-planner/density";
import {
  blankPassenger,
  buildFlightConfirmation,
  classifyFlightFailure,
  FLIGHT_CARD_REQUIRED,
  flightBookingPayment,
  flightDateLabel,
  flightDayOffset,
  flightPassengerFieldErrors,
  flightRouteLabel,
  formatFlightClock,
  formatFlightDay,
  formatFlightDuration,
  formatFlightMoney,
  parseFlightParty,
  stopsLabel,
  type FlightBooking,
  type FlightConfirmationDetails,
  type FlightFailure,
  type FlightOffer,
  type FlightPassengerInput,
  type FlightParty,
  type FlightPrebook,
  type FlightPriceChange,
  type FlightsQuery,
} from "@/lib/flights";
import { rememberFlightConfirmation } from "@/lib/flights-itinerary";

type Props = {
  offer: FlightOffer;
  changes: FlightPriceChange | null;
  query: FlightsQuery;
  sandbox: boolean;
  listHref: string;
  planHref: string;
};

type Pending = "" | "prebook" | "book";

function priceMoved(changes: FlightPriceChange | null): boolean {
  if (!changes) return false;
  if (changes.oldTotal == null || changes.newTotal == null) return changes.messages.length > 0;
  return changes.oldTotal !== changes.newTotal;
}

function LegLine({
  label,
  from,
  to,
  depart,
  arrive,
  stops,
}: {
  label: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  stops: number;
}) {
  const offset = flightDayOffset(depart, arrive);
  return (
    <div className="plan-stack-tight">
      <p className={plan.label}>{label}</p>
      <p className="font-display text-xl font-bold text-heading">
        {formatFlightClock(depart) || "—"}
        <span className="px-2 text-muted">–</span>
        {formatFlightClock(arrive) || "—"}
        {offset > 0 ? <span className="ml-1 text-sm text-muted">+{offset}</span> : null}
      </p>
      <p className="text-sm text-muted">
        {[formatFlightDay(depart), `${from} → ${to}`, stopsLabel(stops)].filter(Boolean).join(" · ")}
      </p>
    </div>
  );
}

export function FlightBooker({
  offer,
  changes,
  query,
  sandbox,
  listHref,
  planHref,
}: Props) {
  const count = query.adults + query.children;
  const [passengers, setPassengers] = useState<FlightPassengerInput[]>(() =>
    Array.from({ length: count }, (_, index) => blankPassenger(index === 0)),
  );
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FlightPassengerInput, string>>[]
  >([]);
  const [acceptedPrice, setAcceptedPrice] = useState(false);
  const [prebook, setPrebook] = useState<FlightPrebook | null>(null);
  const [paidTransaction, setPaidTransaction] = useState("");
  const [party, setParty] = useState<FlightParty | null>(null);
  const [confirmation, setConfirmation] = useState<FlightConfirmationDetails | null>(null);
  const [failure, setFailure] = useState<FlightFailure | null>(null);
  const [pending, setPending] = useState<Pending>("");
  const lock = useRef(false);
  const moved = priceMoved(changes);
  const busy = pending !== "";

  function patchPassenger(index: number, patch: Partial<FlightPassengerInput>) {
    setPassengers((current) =>
      current.map((passenger, itemIndex) =>
        itemIndex === index ? { ...passenger, ...patch } : passenger,
      ),
    );
  }

  async function readError(response: Response): Promise<{ message: string; code: string }> {
    try {
      const payload = (await response.json()) as { error?: unknown; code?: unknown };
      const message =
        typeof payload.error === "string" && payload.error.trim()
          ? payload.error
          : "Nuitee could not complete that step.";
      const code = typeof payload.code === "string" ? payload.code : "";
      return { message, code };
    } catch {
      return { message: "Nuitee could not complete that step.", code: "" };
    }
  }

  async function holdFare(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (lock.current) return;
    const errors = passengers.map((passenger, index) =>
      flightPassengerFieldErrors(
        passenger,
        index < query.adults ? "adult" : "child",
        index === 0,
        query.startDate,
      ),
    );
    setFieldErrors(errors);
    if (errors.some((entry) => Object.keys(entry).length > 0)) {
      setFailure(null);
      return;
    }
    if (moved && !acceptedPrice) {
      setFailure({
        title: "The fare changed",
        message: "Accept the updated price before holding this flight.",
        recovery: "accept-price",
      });
      return;
    }
    const parsed = parseFlightParty(passengers, query.adults, query.children, query.startDate);
    if (!parsed) return;
    lock.current = true;
    setFailure(null);
    setPaidTransaction("");
    setPending("prebook");
    try {
      const response = await fetch("/api/flights/prebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.offerId,
          passengers,
          adults: query.adults,
          children: query.children,
          departDate: query.startDate,
        }),
      });
      if (!response.ok) {
        const { message, code } = await readError(response);
        setFailure(classifyFlightFailure({ stage: "prebook", message, code }));
        return;
      }
      const payload = (await response.json()) as { prebook?: FlightPrebook };
      if (!payload.prebook?.prebookId) {
        setFailure(
          classifyFlightFailure({
            stage: "prebook",
            message: "Nuitee did not hold that fare. Search again and pick another flight.",
          }),
        );
        return;
      }
      setParty(parsed);
      setPrebook(payload.prebook);
    } catch {
      setFailure(
        classifyFlightFailure({
          stage: "prebook",
          message: "Nuitee could not be reached. Try that flight again.",
        }),
      );
    } finally {
      lock.current = false;
      setPending("");
    }
  }

  async function bookHeld(transactionId: string) {
    if (lock.current || !prebook || !party) return;
    if (!flightBookingPayment(transactionId)) {
      setFailure(
        classifyFlightFailure({
          stage: "book",
          message: FLIGHT_CARD_REQUIRED,
        }),
      );
      return;
    }
    lock.current = true;
    setFailure(null);
    setPending("book");
    try {
      const response = await fetch("/api/flights/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prebookId: prebook.prebookId,
          transactionId: transactionId || undefined,
        }),
      });
      if (!response.ok) {
        const { message, code } = await readError(response);
        setFailure(classifyFlightFailure({ stage: "book", message, code }));
        return;
      }
      const payload = (await response.json()) as { booking?: FlightBooking };
      if (!payload.booking?.bookingId) {
        setFailure(
          classifyFlightFailure({
            stage: "book",
            message:
              "Nuitee did not return a confirmation. Check the sandbox dashboard before trying again.",
          }),
        );
        return;
      }
      const booked = buildFlightConfirmation({
        booking: payload.booking,
        offer: prebook.offer ?? offer,
        party,
        sandbox,
        paidBy: "card",
      });
      rememberFlightConfirmation(booked);
      setConfirmation(booked);
    } catch {
      setFailure(
        classifyFlightFailure({
          stage: "book",
          message:
            "Nuitee could not be reached. If you already submitted, check the sandbox dashboard before booking again.",
        }),
      );
    } finally {
      lock.current = false;
      setPending("");
    }
  }

  if (confirmation) {
    return (
      <FlightConfirmationScreen
        confirmation={confirmation}
        query={query}
        listHref={listHref}
        planHref={planHref}
        redirect
      />
    );
  }

  const heldPrice = prebook?.price ?? offer.price;
  const total = formatFlightMoney(heldPrice);

  return (
    <div className="plan-stack">
      <section className="panel plan-inset plan-stack p-5">
        <p className="eyebrow">{offer.airline}</p>
        <h2 className="font-display text-2xl font-bold text-heading">{flightRouteLabel(offer)}</h2>
        <p className="text-sm text-muted">
          {[flightDateLabel(offer), offer.cabin, formatFlightDuration(offer.durationMinutes)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <LegLine
          label={offer.returnDepartureTime ? "Outbound" : "Flight"}
          from={offer.originCode}
          to={offer.destinationCode}
          depart={offer.departureTime}
          arrive={offer.arrivalTime}
          stops={offer.outboundStops}
        />
        {offer.returnDepartureTime ? (
          <LegLine
            label="Return"
            from={offer.destinationCode}
            to={offer.originCode}
            depart={offer.returnDepartureTime}
            arrive={offer.returnArrivalTime}
            stops={offer.returnStops}
          />
        ) : null}
        {offer.baggage ? <p className="text-sm text-text">{offer.baggage}</p> : null}
        {offer.conditions.length > 0 ? (
          <ul className="plan-stack-tight text-sm leading-relaxed text-text">
            {offer.conditions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : null}
        <p className="font-semibold text-heading">{total || "Price on request"}</p>
        {offer.refundable === false ? (
          <p className="text-sm text-muted">Non-refundable fare</p>
        ) : offer.refundable ? (
          <p className="text-sm text-muted">Refundable fare</p>
        ) : null}
      </section>

      {moved && changes ? (
        <div className="panel plan-inset plan-stack p-5" role="status">
          <h2 className="font-display text-xl font-bold text-heading">The fare changed</h2>
          <p className="text-sm leading-relaxed text-text">
            {changes.oldTotal != null ? (
              <span className="line-through">
                {formatFlightMoney({
                  amount: changes.oldTotal,
                  currency: changes.currency || "USD",
                })}
              </span>
            ) : null}{" "}
            {changes.newTotal != null
              ? formatFlightMoney({
                  amount: changes.newTotal,
                  currency: changes.currency || "USD",
                })
              : "The price moved before checkout."}
          </p>
          {changes.messages.map((line) => (
            <p key={line} className="text-sm text-text">
              {line}
            </p>
          ))}
          <label className="flex items-start gap-2 text-sm text-text">
            <input
              type="checkbox"
              className="mt-1"
              checked={acceptedPrice}
              onChange={(event) => setAcceptedPrice(event.target.checked)}
            />
            Accept the updated price
          </label>
        </div>
      ) : null}

      {offer.segments.length > 0 ? (
        <ol className="plan-stack">
          {offer.segments.map((segment) => (
            <li key={`${segment.flightNumber}-${segment.departureTime}`} className="panel plan-inset p-4">
              <p className="font-semibold text-heading">
                {segment.carrierName || segment.flightNumber} {segment.flightNumber}
              </p>
              <p className="text-sm text-muted">
                {formatFlightDay(segment.departureTime)} {formatFlightClock(segment.departureTime)}{" "}
                {segment.originCode}
                {" → "}
                {formatFlightClock(segment.arrivalTime)} {segment.destinationCode}
                {segment.durationMinutes
                  ? ` · ${formatFlightDuration(segment.durationMinutes)}`
                  : ""}
              </p>
            </li>
          ))}
        </ol>
      ) : null}

      {failure ? (
        <FlightFailureNotice
          failure={failure}
          listHref={listHref}
          pending={busy}
          onRetry={() => {
            setFailure(null);
            if (!prebook) void holdFare();
            else if (paidTransaction) void bookHeld(paidTransaction);
          }}
        />
      ) : null}

      {prebook ? (
        <section className="panel plan-inset plan-stack p-5">
          <h2 className="font-display text-xl font-bold text-heading">Fare held</h2>
          <p className="text-sm leading-relaxed text-text">
            {total ? `${total} for this itinerary.` : "Nuitee held this itinerary."}{" "}
            {prebook.payment
              ? "Pay with the card form from Nuitee. The ticket is booked after Stripe confirms."
              : FLIGHT_CARD_REQUIRED}
          </p>
          {prebook.payment ? (
            <FlightCardPayment
              key={`${prebook.payment.transactionId}:${prebook.payment.publishableKey}`}
              payment={prebook.payment}
              busy={busy}
              sandbox={sandbox}
              onAttempt={() => setFailure(null)}
              onPaid={(transactionId) => {
                setPaidTransaction(transactionId);
                void bookHeld(transactionId);
              }}
              onError={(message) =>
                setFailure(classifyFlightFailure({ stage: "book", message }))
              }
            />
          ) : (
            <Link href={listHref} className="btn btn-primary inline-flex">
              Search again
            </Link>
          )}
          <Link href={listHref} className="btn btn-secondary inline-flex">
            Back to flights
          </Link>
        </section>
      ) : (
        <form className="panel plan-inset plan-stack p-5" onSubmit={(event) => void holdFare(event)}>
          <h2 className="font-display text-xl font-bold text-heading">Passengers</h2>
          <p className="text-sm text-muted">
            Names and passport details as they appear on the travel document.
          </p>
          {passengers.map((passenger, index) => {
            const errors = fieldErrors[index] ?? {};
            const role = index < query.adults ? "Adult" : "Child";
            return (
              <fieldset key={index} className="plan-stack border-t border-border pt-4">
                <legend className={plan.label}>
                  {role} {index + 1}
                  {index === 0 ? " · contact" : ""}
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="plan-stack-tight">
                    <span className={plan.label}>First name</span>
                    <input
                      required
                      className={plan.input}
                      value={passenger.firstName}
                      autoComplete={index === 0 ? "given-name" : "off"}
                      aria-invalid={Boolean(errors.firstName)}
                      onChange={(event) => patchPassenger(index, { firstName: event.target.value })}
                    />
                  </label>
                  <label className="plan-stack-tight">
                    <span className={plan.label}>Last name</span>
                    <input
                      required
                      className={plan.input}
                      value={passenger.lastName}
                      autoComplete={index === 0 ? "family-name" : "off"}
                      aria-invalid={Boolean(errors.lastName)}
                      onChange={(event) => patchPassenger(index, { lastName: event.target.value })}
                    />
                  </label>
                  <label className="plan-stack-tight">
                    <span className={plan.label}>Date of birth</span>
                    <input
                      type="date"
                      required
                      className={plan.input}
                      value={passenger.birthday}
                      aria-invalid={Boolean(errors.birthday)}
                      onChange={(event) => patchPassenger(index, { birthday: event.target.value })}
                    />
                  </label>
                  <label className="plan-stack-tight">
                    <span className={plan.label}>Gender</span>
                    <select
                      required
                      className={plan.input}
                      value={passenger.gender}
                      aria-invalid={Boolean(errors.gender)}
                      onChange={(event) =>
                        patchPassenger(index, {
                          gender: event.target.value === "F" ? "F" : event.target.value === "M" ? "M" : "",
                        })
                      }
                    >
                      <option value="">Choose</option>
                      <option value="F">Female</option>
                      <option value="M">Male</option>
                    </select>
                  </label>
                  <label className="plan-stack-tight">
                    <span className={plan.label}>Nationality</span>
                    <input
                      required
                      maxLength={2}
                      className={plan.input}
                      value={passenger.nationality}
                      aria-invalid={Boolean(errors.nationality)}
                      onChange={(event) =>
                        patchPassenger(index, { nationality: event.target.value.toUpperCase() })
                      }
                    />
                  </label>
                  <label className="plan-stack-tight">
                    <span className={plan.label}>Passport number</span>
                    <input
                      required
                      className={plan.input}
                      value={passenger.documentNumber}
                      autoComplete="off"
                      aria-invalid={Boolean(errors.documentNumber)}
                      onChange={(event) =>
                        patchPassenger(index, { documentNumber: event.target.value.toUpperCase() })
                      }
                    />
                  </label>
                  <label className="plan-stack-tight">
                    <span className={plan.label}>Passport expiry</span>
                    <input
                      type="date"
                      required
                      className={plan.input}
                      value={passenger.documentExpiry}
                      aria-invalid={Boolean(errors.documentExpiry)}
                      onChange={(event) =>
                        patchPassenger(index, { documentExpiry: event.target.value })
                      }
                    />
                  </label>
                  {index === 0 ? (
                    <>
                      <label className="plan-stack-tight">
                        <span className={plan.label}>Email</span>
                        <input
                          type="email"
                          required
                          className={plan.input}
                          value={passenger.email}
                          autoComplete="email"
                          aria-invalid={Boolean(errors.email)}
                          onChange={(event) => patchPassenger(index, { email: event.target.value })}
                        />
                      </label>
                      <label className="plan-stack-tight">
                        <span className={plan.label}>Phone country</span>
                        <input
                          inputMode="numeric"
                          required
                          className={plan.input}
                          value={passenger.phoneCountry}
                          aria-invalid={Boolean(errors.phoneCountry)}
                          onChange={(event) =>
                            patchPassenger(index, {
                              phoneCountry: event.target.value.replace(/\D/g, "").slice(0, 3),
                            })
                          }
                        />
                      </label>
                      <label className="plan-stack-tight">
                        <span className={plan.label}>Phone</span>
                        <input
                          type="tel"
                          required
                          className={plan.input}
                          value={passenger.phoneNumber}
                          autoComplete="tel"
                          aria-invalid={Boolean(errors.phoneNumber)}
                          onChange={(event) =>
                            patchPassenger(index, { phoneNumber: event.target.value })
                          }
                        />
                      </label>
                    </>
                  ) : null}
                </div>
                {Object.values(errors).filter(Boolean).length > 0 ? (
                  <p className="text-sm font-semibold text-link">
                    {Object.values(errors).filter(Boolean)[0]}
                  </p>
                ) : null}
              </fieldset>
            );
          })}
          <div className="plan-actions plan-sticky plan-sticky-page plan-sticky-solo">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {pending === "prebook" ? "Holding fare…" : "Continue"}
            </button>
            <Link href={listHref} className="btn btn-secondary">
              Back to flights
            </Link>
          </div>
          <p className="text-sm text-muted">
            {sandbox
              ? "Continue holds the fare. The sandbox card is 4242 4242 4242 4242."
              : "Continue holds the fare, then the card form from Nuitee finishes the booking."}
          </p>
        </form>
      )}
    </div>
  );
}
