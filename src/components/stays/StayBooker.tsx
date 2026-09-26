"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { StayConfirmation } from "@/components/stays/StayConfirmation";
import { StayFailureNotice } from "@/components/stays/StayFailureNotice";
import { StayRoomGallery } from "@/components/stays/StayRoomGallery";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ListRow } from "@/components/ui/ListRow";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  buildStayConfirmation,
  classifyStayFailure,
  formatStayMoney,
  parseStayGuest,
  refundableLabel,
  stayConfirmationPath,
  stayGuestFieldErrors,
  stayNights,
  staysCheckoutPath,
  staysQueryString,
  type StayBooking,
  type StayConfirmationDetails,
  type StayFailure,
  type StayGuest,
  type StayPrebook,
  type StayRefundable,
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
  /** Hotel hero, used when a room has no Nuitee photo. */
  fallbackPhoto?: string;
  query: StaysQuery;
  sandbox: boolean;
  stayHref: string;
  listHref: string;
  planHref: string;
  /** Dedicated checkout mode verifies one selected offer and shows only checkout. */
  checkoutMode?: boolean;
  selectedOfferId?: string;
  hotelHref?: string;
};

type Pending = "" | "prebook" | "book" | "rates";
type ItineraryState = "adding" | "added" | "missing";

function groupRoomOffers(rooms: StayRoomOffer[]) {
  const groups = new Map<string, StayRoomOffer[]>();
  for (const room of rooms) {
    const key = room.name.trim().toLowerCase() || room.offerId;
    const group = groups.get(key) ?? [];
    group.push(room);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

export function StayBooker({
  hotelId,
  hotelName,
  rooms: initialRooms,
  fallbackPhoto = "",
  query,
  sandbox,
  stayHref,
  listHref,
  planHref,
  checkoutMode = false,
  selectedOfferId = "",
  hotelHref = stayHref,
}: Props) {
  const [rooms, setRooms] = useState(initialRooms);
  const [offerId, setOfferId] = useState(selectedOfferId || initialRooms[0]?.offerId || "");
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
  const autoPrebookStarted = useRef(false);

  const selected = rooms.find((room) => room.offerId === offerId) ?? null;
  const roomGroups = groupRoomOffers(rooms);
  const selectedForReview = prebook
    ? selected ?? findRoomForPrebook(rooms, prebook)
    : selected;
  const busy = pending !== "";

  useEffect(() => {
    if (!checkoutMode || !selectedOfferId || autoPrebookStarted.current) return;
    autoPrebookStarted.current = true;
    void confirmRoom(selectedOfferId);
    // The selected offer is fixed for this checkout route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutMode, selectedOfferId]);

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

  async function confirmRoom(targetOfferId = offerId) {
    if (lock.current || !targetOfferId) return;
    lock.current = true;
    setOfferId(targetOfferId);
    retryStage.current = "prebook";
    setFailure(null);
    setPrebook(null);
    setPending("prebook");
    let followup: StayFailure | null = null;
    try {
      const response = await fetch("/api/stays/prebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offerId: targetOfferId }),
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
    if (checkoutMode) {
      window.location.assign(`${hotelHref}#rooms`);
      return;
    }
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
    const confirmationHref = stayConfirmationPath(confirmation, query);
    let cancelled = false;
    void commitBookedStay(
      bookedStayFromConfirmation(confirmation, confirmationHref || stayHref),
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
    const confirmationHref = stayConfirmationPath(confirmation, query);
    void commitBookedStay(
      bookedStayFromConfirmation(confirmation, confirmationHref || stayHref),
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

      {!checkoutMode && rooms.length === 0 ? (
        <EmptyState
          action={
            <Link href={listHref} className="btn ui-btn btn-secondary">
              Search again
            </Link>
          }
        >
          Nuitee didn’t return a rate for {hotelName}. Try different dates.
        </EmptyState>
      ) : !checkoutMode ? (
        <div className="flex flex-col gap-3 pb-2">
          <h2 className="sr-only">Available rooms</h2>
          {roomGroups.map((group) => {
            const room = group[0];
            const nights = stayNights(query.startDate, query.endDate);
            const lowest = lowestAmount(group);
            let markedLowest = false;
            const facts = [room.bed, room.size, room.maxGuests ? `Sleeps ${room.maxGuests}` : ""]
              .filter(Boolean)
              .join(" · ");
            return (
              <article key={room.offerId} className="ui-card ui-card-compact">
                <div className="book-room-photo">
                  <StayRoomGallery
                    photos={room.photos ?? []}
                    fallback={fallbackPhoto}
                    label={room.name}
                  />
                </div>
                <h3 className="mt-2 text-base font-semibold text-heading">{room.name}</h3>
                {facts ? <p className="ui-list-detail">{facts}</p> : null}
                <RoomAmenities amenities={room.amenities ?? []} />
                <div className="ui-list-stack mt-2">
                  {group.map((rate) => {
                    const isLowest =
                      !markedLowest && group.length > 1 && rate.price?.amount === lowest;
                    if (isLowest) markedLowest = true;
                    return (
                      <RateRow
                        key={rate.offerId}
                        rate={rate}
                        nights={nights}
                        lowest={isLowest}
                        href={staysCheckoutPath(hotelId, rate.offerId, query)}
                      />
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
      {pending === "prebook" ? (
        <div className={checkoutMode ? "ui-card ui-card-compact text-center" : ""} role="status">
          <p className="font-semibold text-heading">Checking your selected room…</p>
          <p className="mt-1 text-sm text-muted">Confirming the latest rate and cancellation terms with Nuitee.</p>
        </div>
      ) : null}

      {prebook ? (
        <form
          id="stay-guest-form"
          className={`ui-card ui-card-compact flex flex-col gap-3 ${checkoutMode ? "max-md:mb-24" : ""}`}
          onSubmit={(event) => void bookRoom(event)}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="ui-field-label">Selected room</p>
              <h2 className="ui-section-title">Review your room</h2>
            </div>
            {checkoutMode ? (
              <Link href={`${hotelHref}#rooms`} className="btn ui-btn btn-secondary">
                Change room
              </Link>
            ) : (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setPrebook(null);
                  setFailure(null);
                  clientReference.current = "";
                }}
              >
                Change room
              </Button>
            )}
          </div>
          <SelectedRoomSummary
            room={selectedForReview}
            prebook={prebook}
            fallbackPhoto={fallbackPhoto}
            query={query}
            alternatives={sameRoomRates(rooms, selectedForReview, offerId, prebook.roomName)}
            hotelId={hotelId}
          />
          <div className="border-t border-border pt-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-heading">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Rate confirmed by Nuitee
            </p>
            <h3 className="ui-section-title mt-1">Who’s checking in?</h3>
          </div>
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
          <div className="grid gap-2 sm:grid-cols-2">
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
          <div className={checkoutMode ? "hidden md:block" : undefined}>
            <Button type="submit" className="w-full" disabled={pending === "book" || pending === "rates"}>
              {pending === "book" ? "Booking…" : "Book this stay"}
            </Button>
          </div>
          {pending === "book" ? (
            <p className="text-sm text-muted" role="status">
              Sending the reservation to Nuitee…
            </p>
          ) : null}
        </form>
      ) : null}
      {checkoutMode && prebook ? (
        <div className="glass glass-strip fixed inset-x-0 bottom-0 z-40 p-3 md:hidden" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-heading">
                {prebook.roomName || selectedForReview?.name || "Selected room"}
              </p>
              <p className="text-xs text-muted">
                {prebook.price != null
                  ? formatStayMoney({
                      amount: prebook.price,
                      currency: prebook.currency || "USD",
                    })
                  : "Total confirmed at booking"}
              </p>
            </div>
            <Button
              type="submit"
              form="stay-guest-form"
              className="shrink-0"
              disabled={pending === "book" || pending === "rates"}
            >
              {pending === "book" ? "Booking…" : "Book this stay"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function normalizedRoomName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Offer IDs can change when checkout reloads live rates. Once prebook confirms
 * the original offer, recover the corresponding refreshed room by its room
 * name so checkout keeps the room-specific Nuitee photos instead of falling
 * back to the hotel hero image.
 */
function findRoomForPrebook(rooms: StayRoomOffer[], prebook: StayPrebook) {
  const target = normalizedRoomName(prebook.roomName);
  if (!target) return null;

  const exact = rooms.find((room) => normalizedRoomName(room.name) === target);
  if (exact) return exact;

  return (
    rooms.find((room) => {
      const candidate = normalizedRoomName(room.name);
      return candidate.length > 8 && (candidate.includes(target) || target.includes(candidate));
    }) ?? null
  );
}

function lowestAmount(group: StayRoomOffer[]): number | null {
  let lowest: number | null = null;
  for (const rate of group) {
    if (rate.price == null) continue;
    if (lowest == null || rate.price.amount < lowest) lowest = rate.price.amount;
  }
  return lowest;
}

function nightlyLabel(amount: number, currency: string, nights: number): string {
  if (nights < 1) return "";
  return formatStayMoney({ amount: amount / nights, currency });
}

function freeCancellationLine(lines: string[]): string {
  return lines.find((line) => /free cancellation/i.test(line)) ?? "";
}

function sameRoomRates(
  rooms: StayRoomOffer[],
  current: StayRoomOffer | null,
  currentOfferId: string,
  roomName: string,
): StayRoomOffer[] {
  const key = normalizedRoomName(current?.name || roomName);
  if (!key) return [];
  return rooms.filter((room) => {
    if (room.offerId === currentOfferId) return false;
    return normalizedRoomName(room.name) === key;
  });
}

function RoomFacts({ room }: { room: StayRoomOffer }) {
  const facts = [
    room.bed,
    room.size,
    room.maxGuests ? `Sleeps ${room.maxGuests}` : "",
  ].filter(Boolean);
  if (facts.length === 0) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {facts.map((fact) => (
        <li
          key={fact}
          className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-text"
        >
          {fact}
        </li>
      ))}
    </ul>
  );
}

function RoomAmenities({ amenities }: { amenities: string[] }) {
  const [open, setOpen] = useState(false);
  if (amenities.length === 0) return null;
  const shown = open ? amenities : amenities.slice(0, 4);
  return (
    <div className="mt-3">
      <ul className="flex flex-wrap gap-1.5" aria-label="Room amenities">
        {shown.map((item) => (
          <li key={item} className="rounded-full bg-surface px-2.5 py-1 text-xs text-text">
            {item}
          </li>
        ))}
      </ul>
      {amenities.length > 4 ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-heading underline"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Show fewer amenities" : `Show all ${amenities.length} amenities`}
        </button>
      ) : null}
    </div>
  );
}

function RateRow({
  rate,
  nights,
  lowest,
  href,
  selected = false,
}: {
  rate: StayRoomOffer;
  nights: number;
  lowest: boolean;
  href: string;
  selected?: boolean;
}) {
  const refundable = rate.refundable === "refundable";
  const freeLine = refundable ? freeCancellationLine(rate.cancellation) : "";
  const extra = [
    ...rate.cancellation.filter((line) => line !== freeLine),
    ...rate.conditions,
    rate.remarks,
  ].filter(Boolean);
  const nightly =
    rate.price && nights > 0 ? nightlyLabel(rate.price.amount, rate.price.currency, nights) : "";
  const detail = [
    freeLine || refundableLabel(rate.refundable),
    lowest ? "Lowest price" : "",
    selected ? "Selected" : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const priceLabel = rate.price ? formatStayMoney(rate.price) : "";
  const rateTitle = rate.boardName || "Room only";
  return (
    <div className={selected ? "rounded-[var(--radius-control)] bg-surface-soft" : undefined}>
      <ListRow
        title={rateTitle}
        detail={detail}
        trailing={
          <span className="book-price">
            {priceLabel || "On confirm"}
            {nightly ? <small>{nightly}/night</small> : <small>total</small>}
          </span>
        }
      />
      {extra.length > 0 || !selected ? (
        <div className="book-rate-actions">
          {extra.length > 0 ? (
            <details className="book-rate-details">
              <summary className="ui-row-action cursor-pointer">Rate details</summary>
              <div className="space-y-1 pb-2">
                {extra.map((line) => (
                  <p key={line} className="text-sm text-text">
                    {line}
                  </p>
                ))}
              </div>
            </details>
          ) : (
            <span className="book-rate-details" />
          )}
          {!selected ? (
            <Link
              href={href}
              className="btn ui-btn btn-primary book-rate-select"
              aria-label={`Select ${[rate.name, rateTitle, priceLabel].filter(Boolean).join(", ")}`}
            >
              Select
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function SelectedRoomSummary({
  room,
  prebook,
  fallbackPhoto,
  query,
  alternatives,
  hotelId,
}: {
  room: StayRoomOffer | null;
  prebook: StayPrebook;
  fallbackPhoto: string;
  query: StaysQuery;
  alternatives: StayRoomOffer[];
  hotelId: string;
}) {
  const nights = stayNights(query.startDate, query.endDate);
  const currency = prebook.currency || room?.price?.currency || "USD";
  const total =
    prebook.price != null
      ? formatStayMoney({ amount: prebook.price, currency })
      : room?.price
        ? formatStayMoney(room.price)
        : "";
  const nightly =
    prebook.price != null && nights > 0 ? nightlyLabel(prebook.price, currency, nights) : "";
  const refundable: StayRefundable =
    prebook.refundable && prebook.refundable !== "unknown"
      ? prebook.refundable
      : room?.refundable || "unknown";
  const freeLine = refundable === "refundable" ? freeCancellationLine(prebook.cancellation) : "";
  const occupancy = [
    `${query.rooms} ${query.rooms === 1 ? "room" : "rooms"}`,
    `${query.adults} ${query.adults === 1 ? "adult" : "adults"}`,
    query.children > 0
      ? `${query.children} ${query.children === 1 ? "child" : "children"}`
      : "",
    nights > 0 ? `${nights} ${nights === 1 ? "night" : "nights"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const label = prebook.roomName || room?.name || "Selected room";

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-soft" aria-label="Selected room details">
      <div className="book-hero relative">
        <StayRoomGallery
          photos={room?.photos ?? []}
          fallback={fallbackPhoto}
          label={label}
        />
      </div>
      <div className="flex flex-col gap-2 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-heading px-2.5 py-1 text-xs font-semibold text-on-solid">
              Selected
            </span>
            <h3 className="ui-section-title mt-1">{label}</h3>
            <p className="mt-2 text-sm text-muted">{occupancy}</p>
            {room ? <RoomFacts room={room} /> : null}
          </div>
          {total ? (
            <div className="shrink-0 sm:text-right">
              <p className="ui-field-hint">Confirmed total</p>
              <p className="book-price mt-1">{total}</p>
              {nightly ? <p className="mt-1 text-xs text-muted">{nightly} per night</p> : null}
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(prebook.boardName || room?.boardName) ? (
            <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-text">
              {prebook.boardName || room?.boardName}
            </span>
          ) : null}
          <span className={`rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold ${refundable === "refundable" ? "text-emerald-700" : "text-text"}`}>
            {freeLine || refundableLabel(refundable)}
          </span>
        </div>

        {room ? <RoomAmenities amenities={room.amenities ?? []} /> : null}

        {prebook.cancellation.filter((line) => line !== freeLine).length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-heading">Cancellation</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-text">
              {prebook.cancellation
                .filter((line) => line !== freeLine)
                .map((line) => (
                  <li key={line}>• {line}</li>
                ))}
            </ul>
          </div>
        ) : null}

        {prebook.conditions.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-heading">Room & rate details</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-text">
              {prebook.conditions.map((line) => (
                <li key={line}>• {line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {prebook.remarks ? <p className="text-sm leading-relaxed text-text">{prebook.remarks}</p> : null}

        {alternatives.length > 0 ? (
          <div className="border-t border-line pt-4">
            <p className="text-sm font-semibold text-heading">Other rates for this room</p>
            <div className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
              {alternatives.map((rate) => (
                <RateRow
                  key={rate.offerId}
                  rate={rate}
                  nights={nights}
                  lowest={false}
                  href={staysCheckoutPath(hotelId, rate.offerId, query)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
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
  const id = `guest-${autoComplete}`;
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Input
        id={id}
        required
        type={type}
        autoComplete={autoComplete}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
