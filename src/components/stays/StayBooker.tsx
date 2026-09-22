"use client";

import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { plan } from "@/components/trip-planner/density";
import { planATripHref } from "@/lib/trip-record";
import {
  formatStayMoney,
  refundableLabel,
  type StayBooking,
  type StayPrebook,
  type StayRoomOffer,
  type StaysQuery,
} from "@/lib/stays";
import { addBookedStayToActivePlan } from "@/lib/stays-itinerary";

type Props = {
  hotelName: string;
  rooms: StayRoomOffer[];
  query: StaysQuery;
  sandbox: boolean;
  stayHref: string;
};

const inputClass = plan.input;

export function StayBooker({ hotelName, rooms, query, sandbox, stayHref }: Props) {
  const [offerId, setOfferId] = useState(rooms[0]?.offerId ?? "");
  const [guest, setGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [prebook, setPrebook] = useState<StayPrebook | null>(null);
  const [booking, setBooking] = useState<StayBooking | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"prebook" | "book" | "">("");
  const [itinerary, setItinerary] = useState<"added" | "missing" | "">("");
  const clientReference = useRef("");

  const selected = rooms.find((room) => room.offerId === offerId) ?? null;

  async function readError(response: Response): Promise<string> {
    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    } catch {
      /* ignore */
    }
    return "Nuitee could not complete that step.";
  }

  async function confirmRoom() {
    if (!offerId) return;
    setError("");
    setPrebook(null);
    setPending("prebook");
    try {
      const response = await fetch("/api/stays/prebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const payload = (await response.json()) as { prebook?: StayPrebook };
      if (!payload.prebook?.prebookId) {
        setError("Nuitee did not confirm that room. Pick another rate.");
        return;
      }
      setPrebook(payload.prebook);
    } catch {
      setError("Nuitee could not be reached. Try that room again.");
    } finally {
      setPending("");
    }
  }

  async function bookRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prebook) return;
    setError("");
    if (!clientReference.current && typeof crypto !== "undefined" && crypto.randomUUID) {
      clientReference.current = `fj-${crypto.randomUUID()}`;
    }
    setPending("book");
    try {
      const response = await fetch("/api/stays/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prebookId: prebook.prebookId,
          clientReference: clientReference.current,
          rooms: query.rooms,
          guest,
        }),
      });
      if (!response.ok) {
        setError(await readError(response));
        return;
      }
      const payload = (await response.json()) as { booking?: StayBooking };
      if (!payload.booking?.bookingId) {
        setError("Nuitee did not return a confirmation.");
        return;
      }
      setBooking(payload.booking);
    } catch {
      setError("Nuitee could not be reached. If you already submitted, check before booking again.");
    } finally {
      setPending("");
    }
  }

  if (rooms.length === 0) {
    return (
      <div className="panel plan-inset p-5">
        <h2 className="font-display text-xl font-bold text-heading">No rooms for these dates</h2>
        <p className="mt-2 text-sm leading-relaxed text-text">
          Nuitee didn’t return a rate for {hotelName}. Try different dates, or compare the same stay elsewhere.
        </p>
      </div>
    );
  }

  if (booking) {
    const confirmedName = booking.hotelName || hotelName;
    const confirmation = booking.hotelConfirmationCode || booking.bookingId;
    return (
      <div className="panel plan-inset plan-stack p-5">
        <p className="eyebrow">Booked</p>
        <h2 className="font-display text-2xl font-bold text-heading">{confirmedName}</h2>
        <p className="text-sm leading-relaxed text-text">
          Nuitee accepted this {sandbox ? "sandbox " : ""}reservation
          {booking.status ? ` · ${booking.status}` : ""}.
          {sandbox
            ? " Sandbox bookings are simulated and are not charged to a guest card."
            : ""}
        </p>
        <dl className="plan-stack-tight text-sm">
          <div>
            <dt className={plan.label}>Confirmation</dt>
            <dd className="font-semibold text-heading">{confirmation}</dd>
          </div>
          {booking.price != null ? (
            <div>
              <dt className={plan.label}>Total</dt>
              <dd className="font-semibold text-heading">
                {formatStayMoney({ amount: booking.price, currency: booking.currency || "USD" })}
              </dd>
            </div>
          ) : null}
        </dl>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              const result = addBookedStayToActivePlan({
                hotelName: confirmedName,
                confirmation,
                href: stayHref,
                notes: [
                  booking.checkin && booking.checkout
                    ? `${booking.checkin}–${booking.checkout}`
                    : "",
                  prebook?.roomName ?? "",
                ]
                  .filter(Boolean)
                  .join(" · "),
              });
              setItinerary(result.ok ? "added" : "missing");
            }}
          >
            Add to itinerary
          </button>
          <Link href={planATripHref()} className="btn btn-secondary">
            Open Plan a Trip
          </Link>
        </div>
        {itinerary === "added" ? (
          <p className="text-sm font-semibold text-heading" role="status">
            Added to the trip open in this browser.
          </p>
        ) : null}
        {itinerary === "missing" ? (
          <p className="text-sm text-text" role="status">
            There’s no trip open in this browser yet. Start one in Plan a Trip, then add the stay.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="plan-stack">
      <fieldset className="plan-stack">
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
                      setError("");
                      clientReference.current = "";
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-heading">{room.name}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {[room.boardName, refundableLabel(room.refundable)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                    {room.remarks ? (
                      <span className="mt-2 block text-sm leading-relaxed text-text">
                        {room.remarks}
                      </span>
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

      {selected ? (
        <div className="plan-actions">
          <button
            type="button"
            className="btn btn-ink"
            disabled={pending === "prebook"}
            onClick={() => void confirmRoom()}
          >
            {pending === "prebook" ? "Checking the rate…" : "Continue with this room"}
          </button>
        </div>
      ) : null}

      {prebook ? (
        <form className="panel plan-inset plan-stack p-5" onSubmit={(event) => void bookRoom(event)}>
          <h2 className="font-display text-xl font-bold text-heading">Guest details</h2>
          <p className="text-sm leading-relaxed text-text">
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
          {query.children > 0 ? (
            <p className="text-sm text-muted">
              Children are priced as age 10, in the first room.
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="plan-stack-tight">
              <span className={plan.label}>First name</span>
              <input
                required
                autoComplete="given-name"
                className={inputClass}
                value={guest.firstName}
                onChange={(event) => setGuest({ ...guest, firstName: event.target.value })}
              />
            </label>
            <label className="plan-stack-tight">
              <span className={plan.label}>Last name</span>
              <input
                required
                autoComplete="family-name"
                className={inputClass}
                value={guest.lastName}
                onChange={(event) => setGuest({ ...guest, lastName: event.target.value })}
              />
            </label>
            <label className="plan-stack-tight">
              <span className={plan.label}>Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                className={inputClass}
                value={guest.email}
                onChange={(event) => setGuest({ ...guest, email: event.target.value })}
              />
            </label>
            <label className="plan-stack-tight">
              <span className={plan.label}>Phone</span>
              <input
                required
                type="tel"
                autoComplete="tel"
                className={inputClass}
                value={guest.phone}
                onChange={(event) => setGuest({ ...guest, phone: event.target.value })}
              />
            </label>
          </div>
          <button type="submit" className="btn btn-primary" disabled={pending === "book"}>
            {pending === "book" ? "Booking…" : "Book this stay"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm font-semibold text-link" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
