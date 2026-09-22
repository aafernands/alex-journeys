"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { StayConfirmation } from "@/components/stays/StayConfirmation";
import { StayFailureNotice } from "@/components/stays/StayFailureNotice";
import { plan } from "@/components/trip-planner/density";
import {
  buildStayConfirmation,
  classifyStayFailure,
  formatStayMoney,
  parseStayGuest,
  refundableLabel,
  stayGuestFieldErrors,
  staysQueryString,
  type StayBooking,
  type StayConfirmationDetails,
  type StayFailure,
  type StayGuest,
  type StayPrebook,
  type StayRoomOffer,
  type StaysQuery,
} from "@/lib/stays";
import {
  bookedStayFromConfirmation,
  commitBookedStay,
  stayTripContext,
  type StayCommitResult,
} from "@/lib/stays-itinerary";

type Props = {
  hotelId: string;
  hotelName: string;
  rooms: StayRoomOffer[];
  query: StaysQuery;
  sandbox: boolean;
  stayHref: string;
  listHref: string;
  planHref: string;
};

const inputClass = plan.input;
type Pending = "" | "prebook" | "book" | "rates";
type ItineraryState = "adding" | "added" | "missing";

export function StayBooker({
  hotelId,
  hotelName,
  rooms: initialRooms,
  query,
  sandbox,
  stayHref,
  listHref,
  planHref,
}: Props) {
  const [rooms, setRooms] = useState(initialRooms);
  const [offerId, setOfferId] = useState(initialRooms[0]?.offerId ?? "");
  const [guest, setGuest] = useState<StayGuest>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StayGuest, string>>>({});
  const [prebook, setPrebook] = useState<StayPrebook | null>(null);
  const [confirmation, setConfirmation] = useState<StayConfirmationDetails | null>(null);
  const [failure, setFailure] = useState<StayFailure | null>(null);
  const [pending, setPending] = useState<Pending>("");
  const [itinerary, setItinerary] = useState<ItineraryState>("adding");
  const [returnHref, setReturnHref] = useState(planHref);
  const [savedAs, setSavedAs] = useState<Exclude<StayCommitResult, { ok: false }>["saved"]>(
    "local",
  );
  const clientReference = useRef("");
  const lock = useRef(false);
  const retryStage = useRef<"prebook" | "book" | "rates">("prebook");

  const selected = rooms.find((room) => room.offerId === offerId) ?? null;
  const busy = pending !== "";

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

  async function refreshRooms(): Promise<boolean> {
    if (lock.current) return false;
    lock.current = true;
    setPending("rates");
    try {
      const response = await fetch(
        `/api/stays/hotels/${encodeURIComponent(hotelId)}?${staysQueryString(query)}`,
      );
      if (!response.ok) return false;
      const payload = (await response.json()) as { rooms?: StayRoomOffer[] };
      const next = Array.isArray(payload.rooms) ? payload.rooms : [];
      setRooms(next);
      setOfferId(next[0]?.offerId ?? "");
      setPrebook(null);
      clientReference.current = "";
      return true;
    } catch {
      return false;
    } finally {
      lock.current = false;
      setPending("");
    }
  }

  async function followFailure(next: StayFailure) {
    setFailure(next);
    if (next.recovery !== "refresh-rooms") return;
    setPrebook(null);
    const refreshed = await refreshRooms();
    if (!refreshed) {
      setFailure({
        title: next.title,
        message: `${next.message} The room list could not be refreshed.`,
        recovery: "back-to-search",
      });
    }
  }

  async function confirmRoom() {
    if (lock.current || !offerId) return;
    lock.current = true;
    retryStage.current = "prebook";
    setFailure(null);
    setPrebook(null);
    setPending("prebook");
    let followup: StayFailure | null = null;
    try {
      const response = await fetch("/api/stays/prebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      if (!response.ok) {
        const { message, code } = await readError(response);
        followup = classifyStayFailure({ stage: "prebook", message, code });
        return;
      }
      const payload = (await response.json()) as { prebook?: StayPrebook };
      if (!payload.prebook?.prebookId) {
        followup = classifyStayFailure({
          stage: "prebook",
          message: "Nuitee did not confirm that room. Pick another rate.",
        });
        return;
      }
      setPrebook(payload.prebook);
      clientReference.current = "";
    } catch {
      followup = classifyStayFailure({
        stage: "prebook",
        message: "Nuitee could not be reached. Try that room again.",
      });
    } finally {
      lock.current = false;
      setPending("");
    }
    if (followup) await followFailure(followup);
  }

  async function bookRoom(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (lock.current || !prebook) return;
    const errors = stayGuestFieldErrors(guest);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setFailure(null);
      return;
    }
    const parsed = parseStayGuest(guest);
    if (!parsed) return;
    lock.current = true;
    retryStage.current = "book";
    setFailure(null);
    if (!clientReference.current && typeof crypto !== "undefined" && crypto.randomUUID) {
      clientReference.current = `fj-${crypto.randomUUID()}`;
    }
    setPending("book");
    let followup: StayFailure | null = null;
    try {
      const response = await fetch("/api/stays/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prebookId: prebook.prebookId,
          clientReference: clientReference.current,
          rooms: query.rooms,
          guest: parsed,
        }),
      });
      if (!response.ok) {
        const { message, code } = await readError(response);
        if (/duplicate|already exists|client.?reference/i.test(message)) {
          clientReference.current = "";
        }
        followup = classifyStayFailure({ stage: "book", message, code });
        return;
      }
      const payload = (await response.json()) as { booking?: StayBooking };
      if (!payload.booking?.bookingId) {
        followup = classifyStayFailure({
          stage: "book",
          message: "Nuitee did not return a confirmation. Check the sandbox dashboard before trying again.",
        });
        return;
      }
      setConfirmation(
        buildStayConfirmation({
          booking: payload.booking,
          hotelName,
          guest: parsed,
          prebook,
          query,
          sandbox,
        }),
      );
    } catch {
      followup = classifyStayFailure({
        stage: "book",
        message: "Nuitee could not be reached. If you already submitted, check the sandbox dashboard before booking again.",
      });
    } finally {
      lock.current = false;
      setPending("");
    }
    if (followup) await followFailure(followup);
  }

  function pickAnotherRoom() {
    setPrebook(null);
    setFailure(null);
    clientReference.current = "";
    void refreshRooms();
  }

  function retryLast() {
    if (retryStage.current === "book") void bookRoom();
    else if (retryStage.current === "rates") void refreshRooms();
    else void confirmRoom();
  }

  const applyCommit = useCallback((result: StayCommitResult) => {
    if (!result.ok) {
      setItinerary("missing");
      return;
    }
    setReturnHref(result.href);
    setSavedAs(result.saved);
    setItinerary("added");
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    let cancelled = false;
    void commitBookedStay(
      bookedStayFromConfirmation(confirmation, stayHref),
      stayTripContext(query),
    ).then((result) => {
      if (!cancelled) applyCommit(result);
    });
    return () => {
      cancelled = true;
    };
  }, [applyCommit, confirmation, query, stayHref]);

  function addToItinerary() {
    if (!confirmation || itinerary === "adding") return;
    setItinerary("adding");
    void commitBookedStay(
      bookedStayFromConfirmation(confirmation, stayHref),
      stayTripContext(query),
    ).then(applyCommit);
  }

  if (confirmation) {
    return (
      <StayConfirmation
        confirmation={confirmation}
        listHref={listHref}
        planHref={returnHref}
        itinerary={itinerary}
        saved={savedAs}
        onAddToItinerary={addToItinerary}
      />
    );
  }

  return (
    <div className="plan-stack" aria-busy={busy}>
      {failure ? (
        <StayFailureNotice
          failure={failure}
          listHref={listHref}
          pending={busy}
          onRefreshRooms={() => void refreshRooms()}
          onPickAnother={pickAnotherRoom}
          onRetry={retryLast}
        />
      ) : null}
      {pending === "rates" ? (
        <p className="text-sm text-muted" role="status">
          Checking which rooms are still open…
        </p>
      ) : null}

      {rooms.length === 0 ? (
        <div className="panel plan-inset p-5">
          <h2 className="font-display text-xl font-bold text-heading">No rooms for these dates</h2>
          <p className="mt-2 text-sm leading-relaxed text-text">
            Nuitee didn’t return a rate for {hotelName}. Try different dates.
          </p>
          <Link href={listHref} className="btn btn-secondary mt-4 inline-flex">
            Search again
          </Link>
        </div>
      ) : (
        <fieldset className="plan-stack" disabled={busy}>
          <legend className="font-display text-xl font-bold text-heading">Rooms</legend>
          <div className="plan-stack">
            {rooms.map((room) => {
              const checked = room.offerId === offerId;
              return (
                <label
                  key={room.offerId}
                  className={`panel plan-inset flex cursor-pointer flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between ${
                    checked ? "border-accent" : ""
                  }`}
                >
                  <span className="flex min-w-0 gap-3">
                    <input
                      type="radio"
                      name="room"
                      className="mt-1 accent-[var(--accent)]"
                      checked={checked}
                      onChange={() => {
                        setOfferId(room.offerId);
                        setPrebook(null);
                        setFailure(null);
                        clientReference.current = "";
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-heading">{room.name}</span>
                      <span className="mt-1 block text-sm text-muted">
                        {[room.boardName, refundableLabel(room.refundable)].filter(Boolean).join(" · ")}
                      </span>
                      {room.cancellation.map((line) => (
                        <span key={line} className="mt-1 block text-sm leading-relaxed text-text">
                          {line}
                        </span>
                      ))}
                      {room.conditions.map((line) => (
                        <span key={line} className="mt-1 block text-sm leading-relaxed text-text">
                          {line}
                        </span>
                      ))}
                      {room.remarks ? (
                        <span className="mt-2 block text-sm leading-relaxed text-text">{room.remarks}</span>
                      ) : null}
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-lg font-bold text-heading sm:text-right">
                    {room.price ? formatStayMoney(room.price) : "Price on confirm"}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {selected ? (
        <div className="plan-actions">
          <button
            type="button"
            className="btn btn-ink"
            disabled={busy}
            onClick={() => void confirmRoom()}
          >
            {pending === "prebook" ? "Checking the rate…" : "Continue with this room"}
          </button>
        </div>
      ) : null}
      {pending === "prebook" ? (
        <p className="text-sm text-muted" role="status">
          Checking that this rate is still open…
        </p>
      ) : null}

      {prebook ? (
        <form className="panel plan-inset plan-stack p-5" onSubmit={(event) => void bookRoom(event)}>
          <h2 className="font-display text-xl font-bold text-heading">Guest details</h2>
          <p className="text-sm leading-relaxed text-text">
            {prebook.roomName ? `${prebook.roomName}. ` : ""}
            {prebook.price != null
              ? `Confirmed total ${formatStayMoney({
                  amount: prebook.price,
                  currency: prebook.currency || "USD",
                })}.`
              : "Nuitee confirmed the room."}{" "}
            {prebook.priceDifferencePercent
              ? `The price moved ${prebook.priceDifferencePercent}% from the list. `
              : ""}
            {prebook.cancellationChanged ? "Cancellation terms changed. " : ""}
            {prebook.boardChanged ? "The meal plan changed. " : ""}
            {sandbox
              ? "Sandbox checkout uses Nuitee’s simulated account card, so this does not charge a guest card."
              : "A sandbox key is required to finish a test booking."}
          </p>
          {prebook.cancellation.length > 0 ? (
            <ul className="plan-stack-tight text-sm leading-relaxed text-text">
              {prebook.cancellation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
          {prebook.conditions.map((line) => (
            <p key={line} className="text-sm leading-relaxed text-text">
              {line}
            </p>
          ))}
          {prebook.remarks ? <p className="text-sm leading-relaxed text-text">{prebook.remarks}</p> : null}
          {prebook.terms ? <p className="text-sm leading-relaxed text-text">{prebook.terms}</p> : null}
          {query.children > 0 ? (
            <p className="text-sm text-muted">Children are priced as age 10, in the first room.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <GuestField
              label="First name"
              autoComplete="given-name"
              value={guest.firstName}
              error={fieldErrors.firstName}
              disabled={pending === "book"}
              onChange={(firstName) => {
                setGuest({ ...guest, firstName });
                setFieldErrors({ ...fieldErrors, firstName: undefined });
              }}
            />
            <GuestField
              label="Last name"
              autoComplete="family-name"
              value={guest.lastName}
              error={fieldErrors.lastName}
              disabled={pending === "book"}
              onChange={(lastName) => {
                setGuest({ ...guest, lastName });
                setFieldErrors({ ...fieldErrors, lastName: undefined });
              }}
            />
            <GuestField
              label="Email"
              type="email"
              autoComplete="email"
              value={guest.email}
              error={fieldErrors.email}
              disabled={pending === "book"}
              onChange={(email) => {
                setGuest({ ...guest, email });
                setFieldErrors({ ...fieldErrors, email: undefined });
              }}
            />
            <GuestField
              label="Phone"
              type="tel"
              autoComplete="tel"
              value={guest.phone}
              error={fieldErrors.phone}
              disabled={pending === "book"}
              onChange={(phone) => {
                setGuest({ ...guest, phone });
                setFieldErrors({ ...fieldErrors, phone: undefined });
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending === "book" || pending === "rates"}>
            {pending === "book" ? "Booking…" : "Book this stay"}
          </button>
          {pending === "book" ? (
            <p className="text-sm text-muted" role="status">
              Sending the reservation to Nuitee…
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}

function GuestField({
  label,
  value,
  error,
  onChange,
  autoComplete,
  type = "text",
  disabled,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  autoComplete: string;
  type?: string;
  disabled: boolean;
}) {
  const errorId = error ? `guest-${autoComplete}-error` : undefined;
  return (
    <label className="plan-stack-tight">
      <span className={plan.label}>{label}</span>
      <input
        required
        type={type}
        autoComplete={autoComplete}
        className={inputClass}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={errorId}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <span id={errorId} className={plan.error}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
