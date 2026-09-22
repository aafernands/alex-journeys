"use client";

import { useState } from "react";
import Link from "next/link";
import { journalNotesForDestination, type JournalNote, type JournalPlace } from "@/lib/trip-journal";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { NavIcon } from "@/components/icons/NavIcon";
import type { TripSaveMode } from "@/components/trip-planner/useTripSync";
import {
  dateSummary,
  hotelLaneHref,
  isFlightLanePartner,
  partnerLaneHref,
  travelerSummary,
  type PlannerState,
  type TripPlannerConfig,
  type TripPlannerPartner,
} from "@/lib/trip-planner-model";
import {
  cleanConfirmation,
  cleanDayIndex,
  cleanTime,
  createTripItem,
  extractBookingPaste,
  mentionedTripDay,
  isTripItemUrl,
  itemsForLane,
  itemTypeForPartner,
  compareScheduledItems,
  planATripLoginHref,
  TRIPS_ACCOUNT_UNAVAILABLE,
  sharePlanHref,
  scheduledDayIndex,
  tripDays,
  TRIP_ITEM_STATUSES,
  TRIP_STATUS_LABEL,
  type TripDay,
  type TripItem,
  type TripItemStatus,
  type TripItemType,
} from "@/lib/trip-record";
import type { StoredPlan } from "@/lib/trip-planner-storage";
import { FLIGHT_LANE_HASH } from "@/lib/flights-itinerary";
import { STAY_LANE_HASH } from "@/lib/stays-itinerary";
import { plan } from "@/components/trip-planner/density";
import { ForwardBookings } from "@/components/trip-planner/ForwardBookings";
import { PlanFold, PlanHint } from "@/components/trip-planner/PlanFold";
import { WeekView } from "@/components/trip-planner/WeekView";

type Props = {
  headingId: string;
  config: TripPlannerConfig;
  partners: TripPlannerPartner[];
  state: PlannerState;
  items: TripItem[];
  flexibleOn: boolean;
  subhead: string;
  tripId: string | null;
  focusStay?: boolean;
  focusFlight?: boolean;
  tripTitle?: string;
  saveMode: TripSaveMode;
  guestBackup: StoredPlan | null;
  journalNotes: readonly JournalNote[];
  journalPlaceIndex: readonly JournalPlace[];
  packingNotes: string;
  onItemsChange: (items: TripItem[]) => void;
  onPackingNotesChange: (notes: string) => void;
  onEditTrip: () => void;
  onStartOver: () => void;
  saveDetail: string | null;
  onSaveToAccount: () => void;
  onDeclineMerge: () => void;
  onRetrySave: () => void;
  onRestoreBackup: () => void;
  onRememberGuestDraft: () => void;
};

function ItineraryAuthLinks({
  tripId,
  onRemember,
}: {
  tripId: string | null;
  onRemember: () => void;
}) {
  return (
    <div className="plan-actions plan-actions-inline plan-follow">
      <Link
        href={planATripLoginHref(tripId, "signin")}
        className="btn btn-ink"
        onClick={onRemember}
      >
        Sign in
      </Link>
      <Link
        href={planATripLoginHref(tripId, "signup")}
        className="btn btn-secondary"
        onClick={onRemember}
      >
        Create account
      </Link>
    </div>
  );
}

function laneIcon(partner: TripPlannerPartner): string {
  if (partner.showWhen === "flights") return "plane";
  if (partner.showWhen === "hotel") return "hotel";
  if (partner.showWhen === "car") return "car";
  if (partner.key === "saily") return "wifi";
  if (partner.key === "world-nomads") return "shield";
  return "compass";
}

function StatusChips({
  value,
  onChange,
  label,
}: {
  value: TripItemStatus;
  onChange: (status: TripItemStatus) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {TRIP_ITEM_STATUSES.map((status) => {
        const pressed = value === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(status)}
            className={`${plan.chip} ${
              pressed
                ? status === "booked"
                  ? "border-ink bg-ink text-on-solid"
                  : status === "skipped"
                    ? "border-border bg-surface-soft text-muted"
                    : "border-accent/30 bg-accent/15 text-accent"
                : "border-border bg-white text-text hover:border-border-strong"
            }`}
          >
            {TRIP_STATUS_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}

function laneName(partner: TripPlannerPartner): string {
  if (partner.showWhen === "flights") return "Flights";
  if (partner.showWhen === "hotel") return "Stay";
  if (partner.showWhen === "car") return "Car";
  return partner.label;
}

function laneProgress(items: TripItem[]): "open" | "booked" | "skipped" {
  if (items.length === 0 || items.some((item) => item.status === "todo")) return "open";
  if (items.some((item) => item.status === "booked")) return "booked";
  return "skipped";
}

const LANE_PROGRESS_LABEL = {
  open: "still open",
  booked: "booked",
  skipped: "skipped",
} as const;

function newestBookedStayId(items: TripItem[]): string | undefined {
  return items
    .filter((item) => item.type === "hotel" && item.status === "booked")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id;
}

function newestBookedFlightId(items: TripItem[]): string | undefined {
  return items
    .filter((item) => item.type === "flight" && item.status === "booked")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]?.id;
}

function ItemUrl({ url, compact = false }: { url: string; compact?: boolean }) {
  if (!url) return null;
  const onSite = url.startsWith("/") && !url.startsWith("//");
  return (
    <OutboundLink
      href={url}
      target={onSite ? undefined : "_blank"}
      rel={onSite ? undefined : "noopener noreferrer"}
      className={`${plan.textBtn} truncate text-link hover:text-accent`}
    >
      {onSite
        ? url.startsWith("/flights")
          ? "View flight"
          : url.startsWith("/stays")
            ? "View stay"
            : "View"
        : compact
          ? url.replace(/^https?:\/\//, "")
          : "Open link"}
      {onSite ? null : <span className="sr-only"> (opens in a new tab)</span>}
    </OutboundLink>
  );
}

function laneMeta(items: TripItem[], isNext: boolean): string {
  const progress = laneProgress(items);
  const count = items.length;
  if (isNext && progress === "open") {
    return count > 0 ? `${count} · next` : "Next";
  }
  if (count > 0) return `${count} · ${LANE_PROGRESS_LABEL[progress]}`;
  return LANE_PROGRESS_LABEL[progress];
}

function itemWhen(item: TripItem, days: TripDay[]): string {
  const dayCount = days.length;
  const index = scheduledDayIndex(item, dayCount);
  const day = index == null ? null : days.find((entry) => entry.index === index);
  return [
    day ? `${day.label} · ${day.detail}` : null,
    item.time ?? null,
    item.confirmation ? `Conf. ${item.confirmation}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function BookingItemForm({
  type,
  laneKey,
  sortOrder,
  existing,
  days,
  framed,
  onSave,
  onCancel,
}: {
  type: TripItemType;
  laneKey?: string;
  sortOrder: number;
  existing?: TripItem;
  days: TripDay[];
  framed?: boolean;
  onSave: (item: TripItem) => void;
  onCancel: () => void;
}) {
  const [paste, setPaste] = useState("");
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [url, setUrl] = useState(existing?.url ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [confirmation, setConfirmation] = useState(existing?.confirmation ?? "");
  const [dayIndex, setDayIndex] = useState(() => {
    if (!existing) return "";
    const index = scheduledDayIndex(existing, days.length);
    return index == null ? "" : String(index);
  });
  const [time, setTime] = useState(existing?.time ?? "");
  const [status, setStatus] = useState<TripItemStatus>(existing?.status ?? "todo");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  function fillFromPaste() {
    const found = extractBookingPaste(paste);
    const day = mentionedTripDay(days, paste);
    if (!found.url && !found.confirmation && !found.time && day == null) {
      setPasteNote(
        "No link, confirmation code, time, or trip day in that text. Fill the fields yourself.",
      );
      return;
    }
    if (found.url) setUrl(found.url);
    if (found.confirmation) setConfirmation(found.confirmation);
    if (found.time) setTime(found.time);
    if (day != null) setDayIndex(String(day));
    setError(null);
    setPasteNote(
      "Filled from the text you pasted. This only reads that text — it does not open booking sites.",
    );
  }

  return (
    <form
      className={
        framed
          ? `${plan.inset} plan-stack-tight`
          : "plan-stack-tight plan-section border-t border-border pt-4"
      }
      onSubmit={(event) => {
        event.preventDefault();
        const trimmedUrl = url.trim();
        if (trimmedUrl && !isTripItemUrl(trimmedUrl)) {
          setError("Use a full http:// or https:// link, or a link on this site.");
          return;
        }
        if (
          !trimmedUrl &&
          !title.trim() &&
          !notes.trim() &&
          !confirmation.trim()
        ) {
          setError("Add a title, a link, a confirmation number, or a note.");
          return;
        }
        const parsedDay = cleanDayIndex(dayIndex || null);
        const cleanedConfirmation = cleanConfirmation(confirmation);
        const cleanedTime = cleanTime(time);
        if (existing) {
          const next: TripItem = {
            ...existing,
            title: title.trim().slice(0, 160) || existing.title,
            url: trimmedUrl,
            notes: notes.trim().slice(0, 2000),
            status,
            updatedAt: new Date().toISOString(),
          };
          if (cleanedConfirmation) next.confirmation = cleanedConfirmation;
          else delete next.confirmation;
          if (parsedDay) next.dayIndex = parsedDay;
          else delete next.dayIndex;
          if (cleanedTime) next.time = cleanedTime;
          else delete next.time;
          onSave(next);
          return;
        }
        onSave(
          createTripItem({
            type,
            laneKey,
            sortOrder,
            title,
            url: trimmedUrl,
            notes,
            confirmation: cleanedConfirmation,
            dayIndex: parsedDay,
            time: cleanedTime,
            status,
          }),
        );
      }}
    >
      <label className="plan-field">
        <span className={plan.label}>
          Paste booking details{" "}
          <span className="font-normal normal-case tracking-normal">(optional)</span>
        </span>
        <textarea
          className={plan.input}
          rows={3}
          placeholder="Paste a confirmation email or summary"
          value={paste}
          onChange={(event) => {
            setPaste(event.target.value);
            setPasteNote(null);
          }}
        />
      </label>
      <p className={`${plan.prose} text-muted plan-desktop-only`}>
        Looks for a link, a confirmation code, a time, and a trip day in the text
        you paste. It does not open or scrape booking sites.
      </p>
      <PlanHint label="What paste reads" mobileOnly>
        Looks for a link, a confirmation code, a time, and a trip day in the text
        you paste. It does not open or scrape booking sites.
      </PlanHint>
      <button type="button" className="btn btn-secondary" onClick={fillFromPaste}>
        Fill from paste
      </button>
      {pasteNote ? (
        <p className={`${plan.body} text-text`} role="status">
          {pasteNote}
        </p>
      ) : null}
      <label className="plan-field">
        <span className={plan.label}>Title</span>
        <input
          className={plan.input}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="plan-field">
        <span className={plan.label}>Link</span>
        <input
          className={plan.input}
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
        />
      </label>
      <label className="plan-field">
        <span className={plan.label}>
          Confirmation #{" "}
          <span className="font-normal normal-case tracking-normal">(optional)</span>
        </span>
        <input
          className={plan.input}
          maxLength={40}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <div className="plan-grid-2">
        <label className="plan-field">
          <span className={plan.label}>Day</span>
          <select
            className={plan.input}
            value={dayIndex}
            onChange={(event) => setDayIndex(event.target.value)}
          >
            <option value="">Unscheduled</option>
            {days.map((day) => (
              <option key={day.index} value={day.index}>
                {day.label}
                {day.detail ? ` · ${day.detail}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="plan-field">
          <span className={plan.label}>
            Time{" "}
            <span className="font-normal normal-case tracking-normal">(optional)</span>
          </span>
          <input
            className={plan.input}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value.slice(0, 5))}
          />
        </label>
      </div>
      <div className="plan-stack-tight">
        <p className={plan.label}>Status</p>
        <StatusChips
          value={status}
          label="Booking status"
          onChange={setStatus}
        />
      </div>
      <label className="plan-field">
        <span className={plan.label}>
          Notes <span className="font-normal normal-case tracking-normal">(optional)</span>
        </span>
        <textarea
          className={plan.input}
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      {error ? (
        <p className={plan.error} role="alert">
          {error}
        </p>
      ) : null}
      <div className="plan-actions plan-actions-inline plan-sticky plan-sticky-page">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          {existing ? "Save changes" : "Add to itinerary"}
        </button>
      </div>
    </form>
  );
}

function ItemCard({
  item,
  days,
  onStatus,
  onEdit,
  onRemove,
  highlighted = false,
}: {
  item: TripItem;
  days: TripDay[];
  onStatus: (status: TripItemStatus) => void;
  onEdit: () => void;
  onRemove: () => void;
  highlighted?: boolean;
}) {
  const when = itemWhen(item, days);
  return (
    <div
      className={`${plan.inset} plan-stack-tight ${
        highlighted ? "ring-2 ring-accent" : ""
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 plan-stack-tight">
          <p className={plan.h4}>{item.title}</p>
          {when ? <p className={`${plan.caption} text-muted`}>{when}</p> : null}
          <ItemUrl url={item.url} compact />
          {item.notes ? (
            <p className={`${plan.body} text-text`}>{item.notes}</p>
          ) : null}
        </div>
        <div className="plan-inline-actions shrink-0">
          <button
            type="button"
            className={`${plan.textBtn} text-accent hover:underline`}
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className={`${plan.textBtn} text-muted transition hover:text-accent`}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
      <StatusChips
        value={item.status}
        label={`Status for ${item.title}`}
        onChange={onStatus}
      />
    </div>
  );
}

function TimelineEntry({
  item,
  days,
  editing,
  onEdit,
  onRemove,
  onSave,
  onCancel,
}: {
  item: TripItem;
  days: TripDay[];
  editing: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onSave: (item: TripItem) => void;
  onCancel: () => void;
}) {
  if (editing) {
    return (
      <BookingItemForm
        framed
        type={item.type}
        existing={item}
        days={days}
        sortOrder={item.sortOrder}
        onSave={onSave}
        onCancel={onCancel}
      />
    );
  }
  return (
    <div className="plan-stack-tight">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 plan-stack-tight">
          <div className="flex flex-wrap items-center gap-2">
            {item.time ? (
              <span className={`${plan.badge} border border-accent/25 bg-accent/10 text-accent`}>
                {item.time}
              </span>
            ) : null}
            <p className={plan.h4}>{item.title}</p>
          </div>
          <p className={plan.label}>
            {[TRIP_STATUS_LABEL[item.status], item.confirmation ? `Conf. ${item.confirmation}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.notes ? (
            <p className={`${plan.body} text-text`}>{item.notes}</p>
          ) : null}
          <ItemUrl url={item.url} />
        </div>
        <div className="plan-inline-actions shrink-0">
          <button
            type="button"
            className={`${plan.textBtn} text-accent hover:underline`}
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className={`${plan.textBtn} text-muted transition hover:text-accent`}
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}

function JournalNotes({
  headingId,
  destination,
  notes,
  places,
}: {
  headingId: string;
  destination: string;
  notes: readonly JournalNote[];
  places: readonly JournalPlace[];
}) {
  const matches = journalNotesForDestination(notes, places, destination);
  const place = destination.split(",")[0]?.trim() || destination.trim();
  return (
    <section className="plan-block" aria-labelledby={`${headingId}-journal`}>
      <h3 id={`${headingId}-journal`} className={`${plan.h3} max-sm:hidden`}>
        Notes from trips I’ve already walked
      </h3>
      {matches.length === 0 ? (
        <>
          <p className={`${plan.caption} text-muted sm:hidden`}>No notes for {place} yet.</p>
          <p className={`${plan.prose} plan-follow text-muted plan-desktop-only`}>
            No journal notes for {place} yet. When a story from that trip is on the
            site, it will show up here.
          </p>
        </>
      ) : (
        <ul className="plan-grid-2 plan-follow">
          {matches.map((note) => (
            <li key={note.slug}>
              <Link
                href={`/${note.slug}`}
                className="panel-interactive plan-inset flex h-full flex-col"
              >
                <span className={plan.h4}>{note.title}</span>
                {note.excerpt ? (
                  <span className={`${plan.body} plan-follow line-clamp-3 text-text`}>
                    {note.excerpt}
                  </span>
                ) : null}
                <span className={`${plan.caption} plan-follow font-semibold text-link`}>
                  Read story
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LaneCta({
  partner,
  state,
  flexibleOn,
  tripId,
  className,
}: {
  partner: TripPlannerPartner;
  state: PlannerState;
  flexibleOn: boolean;
  tripId: string | null;
  className: string;
}) {
  const inApp =
    partner.key === "viator" || partner.key === "booking" || isFlightLanePartner(partner);
  const href =
    partner.key === "booking"
      ? hotelLaneHref(state, flexibleOn, tripId)
      : partnerLaneHref(partner, state, flexibleOn, tripId);
  return (
    <OutboundLink
      href={href}
      affiliate={!inApp}
      target={inApp ? undefined : "_blank"}
      rel={inApp ? undefined : "noopener noreferrer sponsored"}
      className={className}
    >
      {partner.buttonLabel}
      {inApp ? null : <span className="sr-only"> (opens in a new tab)</span>}
    </OutboundLink>
  );
}

export function ItineraryHub({
  headingId,
  config,
  partners,
  state,
  items,
  flexibleOn,
  subhead,
  tripId,
  focusStay = false,
  focusFlight = false,
  tripTitle,
  saveMode,
  guestBackup,
  journalNotes,
  journalPlaceIndex,
  packingNotes,
  onItemsChange,
  onPackingNotesChange,
  onEditTrip,
  onStartOver,
  saveDetail,
  onSaveToAccount,
  onDeclineMerge,
  onRetrySave,
  onRestoreBackup,
  onRememberGuestDraft,
}: Props) {
  const [copied, setCopied] = useState(false);
  const nextLaneKey =
    partners.find((partner) => laneProgress(itemsForLane(items, partner)) === "open")
      ?.key ?? null;
  const flightLaneKey =
    partners.find((partner) => isFlightLanePartner(partner))?.key ?? "expedia";
  const [lanePin, setLanePin] = useState<string | null | "auto">(
    focusFlight ? flightLaneKey : focusStay ? "booking" : "auto",
  );
  const openLane = lanePin === "auto" ? nextLaneKey : lanePin;
  const [layout, setLayout] = useState<"timeline" | "week">("timeline");
  const [editor, setEditor] = useState<
    | { kind: "add-lane"; laneKey: string }
    | { kind: "add-note" }
    | { kind: "edit"; id: string; place: "lane" | "day" }
    | null
  >(null);
  const dates = dateSummary(state, flexibleOn);
  const travelers = travelerSummary(state);
  const days = tripDays(state, flexibleOn);
  const sorted = [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.updatedAt.localeCompare(b.updatedAt),
  );
  const nextSort = sorted.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
  const unscheduled = sorted.filter(
    (item) => scheduledDayIndex(item, days.length) == null,
  );
  const stillOpen = partners.filter(
    (partner) => laneProgress(itemsForLane(items, partner)) === "open",
  ).length;
  const stickyPartner =
    partners.find((partner) => partner.key === openLane) ??
    partners.find((partner) => laneProgress(itemsForLane(items, partner)) === "open") ??
    null;

  function renderTimeline(list: TripItem[]) {
    return (
      <ol className="plan-stack plan-follow">
        {list.map((item) => (
          <li key={item.id}>
            <TimelineEntry
              item={item}
              days={days}
              editing={
                editor?.kind === "edit" &&
                editor.place === "day" &&
                editor.id === item.id
              }
              onEdit={() => setEditor({ kind: "edit", id: item.id, place: "day" })}
              onRemove={() => removeItem(item.id)}
              onSave={replaceItem}
              onCancel={() => setEditor(null)}
            />
          </li>
        ))}
      </ol>
    );
  }

  function updateItem(id: string, patch: Partial<TripItem>) {
    onItemsChange(
      items.map((item) =>
        item.id === id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  function removeItem(id: string) {
    onItemsChange(items.filter((item) => item.id !== id));
    setEditor((current) =>
      current?.kind === "edit" && current.id === id ? null : current,
    );
  }

  function replaceItem(next: TripItem) {
    onItemsChange(items.map((item) => (item.id === next.id ? next : item)));
    setEditor(null);
  }

  function addItem(item: TripItem) {
    onItemsChange([...items, item]);
    setEditor(null);
  }

  function assignDay(id: string, dayIndex: number | null) {
    const nextIndex =
      dayIndex != null && dayIndex >= 1 && dayIndex <= days.length ? dayIndex : null;
    onItemsChange(
      items.map((item) => {
        if (item.id !== id) return item;
        const current = scheduledDayIndex(item, days.length);
        if (current === nextIndex) return item;
        const next: TripItem = { ...item, updatedAt: new Date().toISOString() };
        if (nextIndex == null) delete next.dayIndex;
        else next.dayIndex = nextIndex;
        return next;
      }),
    );
  }

  const saveCopy =
    saveMode === "pending"
      ? "Unsaved changes"
      : saveMode === "saving"
        ? "Saving…"
        : saveMode === "saved"
          ? "Saved to your account"
          : saveMode === "unavailable"
            ? saveDetail || TRIPS_ACCOUNT_UNAVAILABLE
            : saveMode === "error"
              ? saveDetail ||
                "Couldn’t save to your account. This copy stays in this browser."
              : null;

  return (
    <div className="plan-hub">
      <div className="plan-hub-lead plan-stack-tight">
        <p className={`${plan.caption} font-semibold text-muted plan-desktop-only`}>Itinerary</p>
        <h2 id={headingId} className={plan.h2}>
          {tripTitle?.trim() || state.destination.trim() || config.steps.next.heading}
        </h2>
        {tripTitle?.trim() ? (
          <p className={`${plan.caption} text-muted`}>{state.destination.trim()}</p>
        ) : null}
        <p className={`${plan.caption} text-muted`}>
          {[dates, travelers].filter(Boolean).join(" · ")}
          {partners.length > 0
            ? stillOpen > 0
              ? ` · ${stillOpen} still to book`
              : " · All booked"
            : ""}
        </p>
        <p className={`${plan.prose} text-muted plan-desktop-only`}>{subhead}</p>
        <div className="plan-inline-actions plan-hub-actions">
          <button
            type="button"
            className={`${plan.textBtn} text-muted sm:text-accent`}
            onClick={async () => {
              const url = `${window.location.origin}${sharePlanHref({
                state,
                items,
                packingNotes,
              })}`;
              try {
                await navigator.clipboard.writeText(url);
              } catch {
                const field = document.createElement("textarea");
                field.value = url;
                document.body.appendChild(field);
                field.select();
                document.execCommand("copy");
                field.remove();
              }
              setCopied(true);
              window.setTimeout(() => setCopied(false), 2500);
            }}
          >
            Copy link
          </button>
          <button type="button" className={`${plan.textBtn} text-muted sm:text-heading`} onClick={onEditTrip}>
            Edit
          </button>
          <button type="button" className={`${plan.textBtn} text-muted`} onClick={onStartOver}>
            Start over
          </button>
        </div>
      </div>
      <div className="plan-hub-save">
      {copied ? (
        <p className={`${plan.caption} plan-follow font-semibold text-heading`} role="status">
          <span className="plan-mobile-only">Link copied.</span>
          <span className="plan-desktop-only">
            Link copied. Anyone with it can open this itinerary.
          </span>
        </p>
      ) : null}

      {saveMode === "local" ? (
        <>
          <div className="plan-mobile-only">
            <Link
              href={planATripLoginHref(tripId, "signin")}
              className={`${plan.textBtn} text-accent`}
              onClick={onRememberGuestDraft}
            >
              Sign in to save
            </Link>
          </div>
          <aside className={`${plan.soft} plan-section plan-stack-tight plan-desktop-only`} aria-label="Save itinerary">
            <p className={`${plan.prose} text-text`}>
              {tripId
                ? "You’re signed out. This itinerary stays in this browser. Sign in to keep saving it to your account."
                : config.checklistHint}
            </p>
            {tripId ? null : (
              <p className={`${plan.prose} text-text`}>
                Sign in or create an account and you’ll come back to this itinerary.
              </p>
            )}
            <ItineraryAuthLinks tripId={tripId} onRemember={onRememberGuestDraft} />
          </aside>
        </>
      ) : null}

      {saveMode === "offer" ? (
        <aside className={`${plan.soft} plan-section plan-stack-tight`} aria-label="Save itinerary to your account">
          <p className={`${plan.prose} text-text`}>
            Save this browser itinerary to your account so you can open it later?
          </p>
          <div className="plan-actions plan-actions-inline">
            <button type="button" className="btn btn-ink" onClick={onSaveToAccount}>
              Save itinerary
            </button>
            <button type="button" className="btn btn-secondary" onClick={onDeclineMerge}>
              Keep it on this device
            </button>
          </div>
        </aside>
      ) : null}

      {saveMode === "declined" ? (
        <div className="plan-toolbar plan-section">
          <p className={`${plan.body} text-muted`}>This itinerary stays in this browser.</p>
          <button type="button" className="btn btn-secondary" onClick={onSaveToAccount}>
            Save to your account
          </button>
        </div>
      ) : null}

      {saveCopy ? (
        <p className={`${plan.caption} plan-follow font-semibold text-heading`} role="status">
          {saveCopy}
          {saveMode === "saved" ? (
            <>
              {" "}
              <Link href="/account#trips" className="text-link hover:text-accent">
                View in My trips
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      {saveMode === "unavailable" || saveMode === "error" ? (
        <div className="plan-actions plan-actions-inline plan-follow">
          <button type="button" className="btn btn-secondary" onClick={onRetrySave}>
            Try saving again
          </button>
        </div>
      ) : null}
      </div>

      {partners.length > 0 ? (
        <section className="plan-hub-index plan-section plan-desktop-only" aria-labelledby={`${headingId}-left`}>
          <h3 id={`${headingId}-left`} className={plan.label}>
            What’s left to book
          </h3>
          <ul className="plan-status">
            {partners.map((partner) => {
              const progress = laneProgress(itemsForLane(items, partner));
              return (
                <li key={partner.key}>
                  <span className={`${plan.caption} font-semibold text-heading`}>
                    {laneName(partner)}
                  </span>
                  <span className={`${plan.caption} text-muted`}>
                    {LANE_PROGRESS_LABEL[progress]}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {guestBackup ? (
        <aside className={`plan-hub-draft ${plan.soft} plan-section plan-stack-tight`} aria-label="Browser draft">
          <p className={`${plan.prose} text-text`}>
            You also have an unsaved itinerary for {guestBackup.state.destination.trim()} in
            this browser.
          </p>
          <div className="plan-actions plan-actions-inline">
            <button type="button" className="btn btn-secondary" onClick={onRestoreBackup}>
              Restore that draft
            </button>
          </div>
        </aside>
      ) : null}

      <div className="plan-hub-lanes plan-lanes plan-section">
        {partners.map((partner) => {
          const laneItems = itemsForLane(items, partner);
          const adding = editor?.kind === "add-lane" && editor.laneKey === partner.key;
          const laneOpen = openLane === partner.key;
          const isNext = partner.key === nextLaneKey;
          const panelId = `${headingId}-lane-${partner.key}`;
          return (
            <article
              key={partner.key}
              id={
                partner.key === "booking"
                  ? STAY_LANE_HASH
                  : partner.key === flightLaneKey
                    ? FLIGHT_LANE_HASH
                    : undefined
              }
              className={`plan-lane scroll-mt-24 ${partner.isCore ? "plan-lane-core" : ""} ${
                isNext && laneOpen ? "plan-lane-next" : ""
              }`}
            >
              <h3 className="sm:hidden">
                <button
                  type="button"
                  className="plan-fold-toggle"
                  aria-expanded={laneOpen}
                  aria-controls={panelId}
                  onClick={() => setLanePin(laneOpen ? null : partner.key)}
                >
                  <span className="icon-tile icon-tile-sm shrink-0">
                    <NavIcon name={laneIcon(partner)} size={16} />
                  </span>
                  <span className="plan-fold-title">{partner.label}</span>
                  <span className={isNext ? "plan-next-badge" : "plan-fold-meta"}>
                    {laneMeta(laneItems, isNext)}
                  </span>
                  <span className="plan-fold-chevron" aria-hidden="true" />
                </button>
              </h3>
              <div
                id={panelId}
                data-open={laneOpen ? "true" : "false"}
                className="plan-lane-body"
              >
              <div className="hidden gap-3 sm:flex sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="icon-tile icon-tile-sm shrink-0">
                    <NavIcon name={laneIcon(partner)} size={16} />
                  </span>
                  <div className="min-w-0 plan-stack-tight">
                    <h3 className={plan.h3}>{partner.label}</h3>
                    {partner.blurb ? (
                      <p className={`${plan.body} text-muted`}>
                        {partner.blurb}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <LaneCta
                    partner={partner}
                    state={state}
                    flexibleOn={flexibleOn}
                    tripId={tripId}
                    className={`btn self-start sm:self-end ${
                      partner.isCore ? "btn-primary" : "btn-secondary"
                    }`}
                  />
                </div>
              </div>

              {laneItems.length === 0 ? (
                <p className={`${plan.caption} text-muted sm:hidden`}>Nothing saved yet.</p>
              ) : partner.blurb ? (
                <PlanHint label="About this search" mobileOnly>
                  {partner.blurb}
                </PlanHint>
              ) : null}

              {laneOpen && !laneItems.some((item) => item.status === "booked") ? (
                <div className="plan-mobile-only">
                  <LaneCta
                    partner={partner}
                    state={state}
                    flexibleOn={flexibleOn}
                    tripId={tripId}
                    className={`btn btn-block plan-lane-hero ${
                      partner.isCore ? "btn-primary" : "btn-secondary"
                    }`}
                  />
                </div>
              ) : null}

              {laneItems.length === 0 ? (
                <p className={`${plan.body} text-muted plan-desktop-only`}>
                  {partner.key === "booking"
                    ? "Nothing saved here yet. Search stays and the hotel you book comes back to this itinerary."
                    : isFlightLanePartner(partner)
                      ? "Nothing saved here yet. Search flights and the one you book comes back to this itinerary."
                      : "Nothing saved here yet. Search, then add the booking you want to keep."}
                </p>
              ) : (
                <ul className="plan-stack-tight">
                  {laneItems.map((item) => {
                    const editing =
                      editor?.kind === "edit" &&
                      editor.place === "lane" &&
                      editor.id === item.id;
                    const highlighted =
                      (focusStay &&
                        partner.key === "booking" &&
                        item.id === newestBookedStayId(laneItems)) ||
                      (focusFlight &&
                        partner.key === flightLaneKey &&
                        item.id === newestBookedFlightId(laneItems));
                    return (
                      <li key={item.id}>
                        {editing ? (
                          <BookingItemForm
                            framed
                            type={item.type}
                            laneKey={item.laneKey}
                            sortOrder={item.sortOrder}
                            existing={item}
                            days={days}
                            onCancel={() => setEditor(null)}
                            onSave={replaceItem}
                          />
                        ) : (
                          <ItemCard
                            item={item}
                            days={days}
                            highlighted={highlighted}
                            onStatus={(status) => updateItem(item.id, { status })}
                            onEdit={() =>
                              setEditor({ kind: "edit", id: item.id, place: "lane" })
                            }
                            onRemove={() => removeItem(item.id)}
                          />
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {adding ? null : (
                <div className="plan-lane-secondaries">
                  <button
                    type="button"
                    className={`${plan.textBtn} plan-lane-quiet self-start text-muted hover:text-heading sm:text-accent sm:hover:underline`}
                    onClick={() => {
                      setLanePin(partner.key);
                      setEditor({ kind: "add-lane", laneKey: partner.key });
                    }}
                  >
                    Add to itinerary
                  </button>
                </div>
              )}
              {adding ? (
                <BookingItemForm
                  type={itemTypeForPartner(partner)}
                  laneKey={partner.key}
                  sortOrder={nextSort}
                  days={days}
                  onCancel={() => setEditor(null)}
                  onSave={addItem}
                />
              ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <div className="plan-hub-inbox">
      <PlanFold id={`${headingId}-inbox`} title="Inbox" meta="Email">
        <ForwardBookings
          headingId={headingId}
          tripId={tripId}
          days={days}
          partners={partners}
          nextSort={nextSort}
          onAddItem={addItem}
          onRemember={onRememberGuestDraft}
        />
      </PlanFold>
      </div>

      <div className="plan-hub-days">
      <PlanFold
        id={`${headingId}-days`}
        title="Days"
        meta={days.length > 0 ? `${sorted.length} saved` : "No dates"}
        defaultOpen={nextLaneKey == null}
      >
      <section aria-labelledby={`${headingId}-list`}>
        <div className="plan-toolbar">
          <h3 id={`${headingId}-list`} className={`${plan.h3} max-sm:hidden`}>
            Day by day
          </h3>
          <div className="plan-inline-actions" role="tablist" aria-label="Itinerary layout">
            {(
              [
                { id: "timeline", label: "Timeline" },
                { id: "week", label: "Week" },
              ] as const
            ).map((tab) => {
              const active = layout === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`${headingId}-${tab.id}-tab`}
                  aria-selected={active}
                  aria-controls={`${headingId}-${tab.id}-panel`}
                  className={`${plan.chip} ${
                    active
                      ? "border-ink bg-ink text-on-solid"
                      : "border-border bg-white text-text hover:border-border-strong hover:bg-surface-soft"
                  }`}
                  onClick={() => setLayout(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className={`${plan.prose} plan-follow text-muted plan-desktop-only`}>
            Nothing saved yet. Search a partner, then add the booking you want to keep.
          </p>
        ) : null}
        {days.length === 0 ? (
          <p className={`${plan.caption} plan-follow text-muted`}>
            Add dates to split this trip into days.
          </p>
        ) : null}
        {layout === "timeline" ? (
        <div
          role="tabpanel"
          id={`${headingId}-timeline-panel`}
          aria-labelledby={`${headingId}-timeline-tab`}
        >
        {days.length > 0 ? (
          <div className={`${plan.soft} plan-section`}>
            <nav aria-label="Jump to a day" className="flex gap-2 overflow-x-auto pb-1">
              {days.map((day) => {
                const count = sorted.filter(
                  (item) => scheduledDayIndex(item, days.length) === day.index,
                ).length;
                return (
                  <a
                    key={day.index}
                    href={`#${headingId}-day-${day.index}`}
                    className="plan-control inline-flex min-h-11 shrink-0 flex-col justify-center border border-border bg-white px-4 py-2"
                  >
                    <span className={`${plan.caption} font-semibold whitespace-nowrap text-heading`}>
                      {day.label}
                      {count > 0 ? (
                        <span className="ml-1.5 text-accent">{count}</span>
                      ) : null}
                    </span>
                    {day.detail ? (
                      <span className={`${plan.caption} whitespace-nowrap text-muted`}>{day.detail}</span>
                    ) : null}
                  </a>
                );
              })}
              <a
                href={`#${headingId}-unscheduled`}
                className="plan-control inline-flex min-h-11 shrink-0 flex-col justify-center border border-border bg-white px-4 py-2"
              >
                <span className={`${plan.caption} font-semibold whitespace-nowrap text-heading`}>
                  Unscheduled
                  {unscheduled.length > 0 ? (
                    <span className="ml-1.5 text-accent">{unscheduled.length}</span>
                  ) : null}
                </span>
                <span className={`${plan.caption} whitespace-nowrap text-muted`}>No day yet</span>
              </a>
            </nav>
            <div className="plan-section relative">
              <div
                className="absolute bottom-2 left-[0.95rem] top-2 w-px bg-border"
                aria-hidden="true"
              />
              <ol>
              {days.map((day) => {
                const dayItems = sorted
                  .filter((item) => scheduledDayIndex(item, days.length) === day.index)
                  .sort(compareScheduledItems);
                return (
                  <li
                    key={day.index}
                    id={`${headingId}-day-${day.index}`}
                    className="plan-day relative flex scroll-mt-24 gap-3"
                  >
                    <span
                      className={`${plan.caption} relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-white font-semibold text-accent`}
                      aria-hidden="true"
                    >
                      {day.index}
                    </span>
                    <div className={`${plan.inset} plan-day-card min-w-0 flex-1 border border-border bg-white`}>
                      {day.detail ? (
                        <p className={`${plan.caption} font-semibold text-muted`}>
                          {day.detail}
                        </p>
                      ) : null}
                      <h4 className={plan.h4}>
                        {day.label}
                      </h4>
                      {dayItems.length === 0 ? (
                        <p className={`${plan.caption} text-muted plan-desktop-only`}>
                          Nothing on this day yet.
                        </p>
                      ) : (
                        renderTimeline(dayItems)
                      )}
                    </div>
                  </li>
                );
              })}
              </ol>
            </div>
          </div>
        ) : null}

        <section
            id={`${headingId}-unscheduled`}
            className={`${plan.soft} plan-section scroll-mt-24`}
            aria-labelledby={`${headingId}-unscheduled-title`}
          >
            <h4
              id={`${headingId}-unscheduled-title`}
              className={plan.h4}
            >
              Unscheduled
            </h4>
            {unscheduled.length === 0 ? (
              <p className={`${plan.body} plan-follow text-muted plan-desktop-only`}>
                Bookings without a day land here. Choose a day when you add one.
              </p>
            ) : (
              renderTimeline(unscheduled)
            )}
          </section>
        </div>
        ) : (
          <div
            role="tabpanel"
            id={`${headingId}-week-panel`}
            aria-labelledby={`${headingId}-week-tab`}
          >
            {editor?.kind === "edit" && editor.place === "day" ? (
              <div className="plan-follow">
                {sorted
                  .filter((item) => item.id === editor.id)
                  .map((item) => (
                    <BookingItemForm
                      key={item.id}
                      framed
                      type={item.type}
                      existing={item}
                      days={days}
                      sortOrder={item.sortOrder}
                      onSave={replaceItem}
                      onCancel={() => setEditor(null)}
                    />
                  ))}
              </div>
            ) : null}
            <WeekView
              headingId={headingId}
              days={days}
              items={sorted}
              onAssignDay={assignDay}
              onEdit={(id) => setEditor({ kind: "edit", id, place: "day" })}
            />
          </div>
        )}

        {editor?.kind === "add-note" ? (
          <BookingItemForm
            type="note"
            sortOrder={nextSort}
            days={days}
            onCancel={() => setEditor(null)}
            onSave={addItem}
          />
        ) : (
          <button
            type="button"
            className={`${plan.textBtn} plan-follow self-start text-accent hover:underline`}
            onClick={() => setEditor({ kind: "add-note" })}
          >
            Add a note
          </button>
        )}
      </section>
      </PlanFold>
      </div>

      <div className="plan-hub-more">
      <PlanFold
        id={`${headingId}-journal-fold`}
        title="Journal"
        meta="Stories"
      >
      <JournalNotes
        headingId={headingId}
        destination={state.destination}
        notes={journalNotes}
        places={journalPlaceIndex}
      />
      </PlanFold>

      <PlanFold
        id={`${headingId}-packing-fold`}
        title="Packing"
        meta={packingNotes.trim() ? `${packingNotes.trim().split("\n").filter(Boolean).length} lines` : "Empty"}
      >
      <section className="plan-stack-tight" aria-labelledby={`${headingId}-packing`}>
        <h3 id={`${headingId}-packing`} className={`${plan.h3} max-sm:hidden`}>
          Packing notes
        </h3>
        <p className={`${plan.prose} text-muted plan-desktop-only`}>
          A list for this trip. One line per item is enough.
        </p>
        <textarea
          className={plan.input}
          rows={5}
          maxLength={4000}
          placeholder={"Layers for the evening\nAdapter\nWalking shoes"}
          value={packingNotes}
          onChange={(event) => onPackingNotesChange(event.target.value.slice(0, 4000))}
        />
      </section>
      </PlanFold>

      <PlanFold id={`${headingId}-disclosure`} title="About these links">
        <p className={`${plan.body} text-text`}>
          {config.disclosure}{" "}
          <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
            Read the full disclosure
          </Link>
          .
        </p>
      </PlanFold>
      </div>

      {stickyPartner && editor == null && openLane == null ? (
        <div className="plan-hub-sticky plan-sticky plan-sticky-page plan-sticky-solo plan-mobile-only">
          <LaneCta
            partner={stickyPartner}
            state={state}
            flexibleOn={flexibleOn}
            tripId={tripId}
            className={`btn ${stickyPartner.isCore ? "btn-primary" : "btn-secondary"}`}
          />
        </div>
      ) : null}
    </div>
  );
}
