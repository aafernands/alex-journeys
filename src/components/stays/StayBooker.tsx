"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, ShieldCheck } from "lucide-react";
import { StayConfirmation } from "@/components/stays/StayConfirmation";
import { StayFailureNotice } from "@/components/stays/StayFailureNotice";
import { plan } from "@/components/trip-planner/density";
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
  type StayPhoto,
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

const inputClass = plan.input;
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
        <div className="panel plan-inset p-5">
          <h2 className="font-display text-xl font-bold text-heading">No rooms for these dates</h2>
          <p className="mt-2 text-sm leading-relaxed text-text">
            Nuitee didn’t return a rate for {hotelName}. Try different dates.
          </p>
          <Link href={listHref} className="btn btn-secondary mt-4 inline-flex">
            Search again
          </Link>
        </div>
      ) : !checkoutMode ? (
        <fieldset className="space-y-5" disabled={busy}>
          <legend className="sr-only">Available rooms</legend>
          {roomGroups.map((group) => {
            const room = group[0];
            return (
              <article key={room.offerId} className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
                <div className="border-b border-line p-4 sm:flex sm:items-center sm:gap-4 sm:p-5">
                  <RoomPhotos photos={room.photos ?? []} fallback={fallbackPhoto} />
                  <div className="mt-3 min-w-0 sm:mt-0">
                    <h3 className="font-display text-xl font-bold text-heading">{room.name}</h3>
                    <p className="mt-1 text-sm text-muted">
                      {group.length} {group.length === 1 ? "rate" : "rates"} available for your dates
                    </p>
                  </div>
                </div>
                <div className="divide-y divide-line">
                  {group.map((rate) => {
                    return (
                      <div key={rate.offerId} className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-5">
                        <div className="min-w-0">
                          <p className="font-semibold text-heading">{rate.boardName || "Room only"}</p>
                          <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${rate.refundable ? "text-emerald-700" : "text-muted"}`}>
                            {rate.refundable ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                            {refundableLabel(rate.refundable)}
                          </p>
                          {rate.cancellation.map((line) => (
                            <p key={line} className="mt-2 text-sm leading-6 text-text">{line}</p>
                          ))}
                          {rate.conditions.map((line) => (
                            <p key={line} className="mt-1 text-sm leading-6 text-text">{line}</p>
                          ))}
                          {rate.remarks ? <p className="mt-2 text-sm leading-6 text-text">{rate.remarks}</p> : null}
                        </div>
                        <div className="shrink-0 sm:min-w-44 sm:text-right">
                          <p className="text-xs text-muted">Total for your stay</p>
                          <p className="mt-1 font-display text-2xl font-bold text-heading">
                            {rate.price ? formatStayMoney(rate.price) : "Price on confirm"}
                          </p>
                          <Link
                            href={staysCheckoutPath(hotelId, rate.offerId, query)}
                            className="btn btn-primary mt-3 w-full sm:w-auto"
                          >
                            Select
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </fieldset>
      ) : null}
      {pending === "prebook" ? (
        <div className={checkoutMode ? "rounded-xl border border-line bg-white p-6 text-center" : ""} role="status">
          <p className="font-semibold text-heading">Checking your selected room…</p>
          <p className="mt-2 text-sm text-muted">Confirming the latest rate and cancellation terms with Nuitee.</p>
        </div>
      ) : null}

      {prebook ? (
        <form className="space-y-5 rounded-xl border border-line bg-white p-5 shadow-sm sm:p-6" onSubmit={(event) => void bookRoom(event)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Selected room</p>
              <h2 className="mt-1 font-display text-xl font-bold text-heading">Review your room</h2>
            </div>
            {checkoutMode ? (
              <Link href={`${hotelHref}#rooms`} className="btn btn-secondary">
                Change room
              </Link>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => {
                  setPrebook(null);
                  setFailure(null);
                  clientReference.current = "";
                }}
              >
                Change room
              </button>
            )}
          </div>
          <SelectedRoomSummary
            room={selectedForReview}
            prebook={prebook}
            fallbackPhoto={fallbackPhoto}
            query={query}
          />
          <div className="border-t border-line pt-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              Rate confirmed by Nuitee
            </p>
            <h3 className="mt-2 font-display text-xl font-bold text-heading">Who’s checking in?</h3>
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

function RoomPhotos({ photos, fallback }: { photos: StayPhoto[]; fallback: string }) {
  const gallery = photos.slice(0, 3);
  if (gallery.length > 0) {
    return (
      <span className="mt-0.5 flex shrink-0 gap-1">
        {gallery.map((photo, index) => (
          <RoomImage
            key={photo.url}
            photo={photo}
            className={
              index === 0
                ? "h-16 w-20 sm:h-[4.5rem] sm:w-24"
                : "hidden h-16 w-12 sm:block"
            }
          />
        ))}
      </span>
    );
  }
  if (fallback) {
    return (
      <span className="mt-0.5 flex w-20 shrink-0 flex-col gap-1 sm:w-24">
        <RoomImage
          photo={{ url: fallback, caption: "" }}
          className="h-16 w-full sm:h-[4.5rem]"
        />
        <span className={`${plan.caption} text-muted`}>Hotel photo</span>
      </span>
    );
  }
  return (
    <span
      className={`${plan.caption} mt-0.5 grid h-16 w-20 shrink-0 place-items-center rounded-md bg-surface text-center text-muted sm:h-[4.5rem] sm:w-24`}
    >
      No photo
    </span>
  );
}

function RoomImage({ photo, className }: { photo: StayPhoto; className: string }) {
  return (
    // Room CDNs are not a fixed host list, same as hotel cards on /stays.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.url}
      alt=""
      width={96}
      height={72}
      loading="lazy"
      decoding="async"
      className={`rounded-md object-cover ${className}`}
      onError={(event) => {
        const img = event.currentTarget;
        if (photo.fallbackUrl && img.dataset.fallback !== "1") {
          img.dataset.fallback = "1";
          img.src = photo.fallbackUrl;
          return;
        }
        img.classList.add("hidden");
      }}
    />
  );
}

function SelectedRoomSummary({
  room,
  prebook,
  fallbackPhoto,
  query,
}: {
  room: StayRoomOffer | null;
  prebook: StayPrebook;
  fallbackPhoto: string;
  query: StaysQuery;
}) {
  const photos = room?.photos?.length ? room.photos.slice(0, 4) : fallbackPhoto
    ? [{ url: fallbackPhoto, caption: "" }]
    : [];
  const nights = stayNights(query.startDate, query.endDate);
  const total =
    prebook.price != null
      ? formatStayMoney({
          amount: prebook.price,
          currency: prebook.currency || room?.price?.currency || "USD",
        })
      : room?.price
        ? formatStayMoney(room.price)
        : "";
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

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface" aria-label="Selected room details">
      {photos.length > 0 ? (
        <div className="grid grid-cols-4 gap-px bg-line">
          {photos.map((photo, index) => (
            <div
              key={photo.url}
              className={index === 0 ? "col-span-4 sm:col-span-2 sm:row-span-2" : "col-span-2 sm:col-span-1"}
            >
              <RoomImage
                photo={photo}
                className={index === 0 ? "h-52 w-full sm:h-full sm:min-h-48" : "h-24 w-full sm:h-24"}
              />
            </div>
          ))}
        </div>
      ) : null}
      <div className="plan-stack p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h3 className="font-display text-xl font-bold leading-tight text-heading">
              {prebook.roomName || room?.name || "Selected room"}
            </h3>
            <p className="mt-2 text-sm text-muted">{occupancy}</p>
          </div>
          {total ? (
            <div className="shrink-0 sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Confirmed total</p>
              <p className="mt-1 font-display text-xl font-bold text-heading">{total}</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {(prebook.boardName || room?.boardName) ? (
            <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-text">
              {prebook.boardName || room?.boardName}
            </span>
          ) : null}
          <span className="rounded-full border border-line bg-canvas px-3 py-1 text-xs font-semibold text-text">
            {refundableLabel(prebook.refundable || room?.refundable || "unknown")}
          </span>
        </div>

        {prebook.cancellation.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-heading">Cancellation</p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-text">
              {prebook.cancellation.map((line) => (
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

        {prebook.remarks ? (
          <p className="text-sm leading-relaxed text-text">{prebook.remarks}</p>
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
