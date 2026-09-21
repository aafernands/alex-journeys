"use client";

import { useState } from "react";
import Link from "next/link";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { NavIcon } from "@/components/icons/NavIcon";
import type { TripSaveMode } from "@/components/trip-planner/useTripSync";
import {
  dateSummary,
  partnerUrlValues,
  resolveAffiliateHref,
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
  isSafeHttpUrl,
  itemsForLane,
  itemTypeForPartner,
  planATripLoginHref,
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

type Props = {
  headingId: string;
  config: TripPlannerConfig;
  partners: TripPlannerPartner[];
  state: PlannerState;
  items: TripItem[];
  flexibleOn: boolean;
  subhead: string;
  tripId: string | null;
  saveMode: TripSaveMode;
  guestBackup: StoredPlan | null;
  onItemsChange: (items: TripItem[]) => void;
  onEditTrip: () => void;
  onStartOver: () => void;
  onSaveToAccount: () => void;
  onDeclineMerge: () => void;
  onRestoreBackup: () => void;
  onRememberGuestDraft: () => void;
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

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
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={label}>
      {TRIP_ITEM_STATUSES.map((status) => {
        const pressed = value === status;
        return (
          <button
            key={status}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(status)}
            className={`inline-flex min-h-9 items-center rounded-full px-3 text-xs font-semibold transition ${
              pressed
                ? status === "booked"
                  ? "bg-ink text-on-solid"
                  : status === "skipped"
                    ? "bg-surface-soft text-muted"
                    : "bg-accent/15 text-accent"
                : "border border-border bg-white text-text hover:border-border-strong"
            }`}
          >
            {TRIP_STATUS_LABEL[status]}
          </button>
        );
      })}
    </div>
  );
}

function compareScheduled(a: TripItem, b: TripItem): number {
  const ta = a.time ?? "";
  const tb = b.time ?? "";
  if (ta && tb && ta !== tb) return ta.localeCompare(tb);
  if (ta && !tb) return -1;
  if (!ta && tb) return 1;
  return a.sortOrder - b.sortOrder || a.updatedAt.localeCompare(b.updatedAt);
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
    if (!found.url && !found.confirmation) {
      setPasteNote(
        "No link or confirmation code in that text. Fill the fields yourself.",
      );
      return;
    }
    if (found.url) setUrl(found.url);
    if (found.confirmation) setConfirmation(found.confirmation);
    setError(null);
    setPasteNote(
      "Filled from the text you pasted. This only reads that text — it does not open booking sites.",
    );
  }

  return (
    <form
      className={
        framed
          ? "space-y-3 rounded-lg border border-border bg-white p-3"
          : "mt-4 space-y-3 border-t border-border pt-4"
      }
      onSubmit={(event) => {
        event.preventDefault();
        const trimmedUrl = url.trim();
        if (trimmedUrl && !isSafeHttpUrl(trimmedUrl)) {
          setError("Paste a full http:// or https:// link.");
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
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Paste booking details{" "}
        <span className="font-normal normal-case tracking-normal">(optional)</span>
        <textarea
          className={`${inputClass} min-h-20 py-3`}
          rows={3}
          placeholder="Paste a confirmation email or summary"
          value={paste}
          onChange={(event) => {
            setPaste(event.target.value);
            setPasteNote(null);
          }}
        />
      </label>
      <p className="text-sm leading-relaxed text-muted">
        Looks for a link and a confirmation code in the text you paste. It does not
        open or scrape booking sites.
      </p>
      <button type="button" className="btn btn-secondary" onClick={fillFromPaste}>
        Fill from paste
      </button>
      {pasteNote ? (
        <p className="text-sm text-text" role="status">
          {pasteNote}
        </p>
      ) : null}
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Title
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Link
        <input
          className={inputClass}
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Confirmation #{" "}
        <span className="font-normal normal-case tracking-normal">(optional)</span>
        <input
          className={inputClass}
          maxLength={40}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Day
          <select
            className={inputClass}
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
        <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Time{" "}
          <span className="font-normal normal-case tracking-normal">(optional)</span>
          <input
            className={inputClass}
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value.slice(0, 5))}
          />
        </label>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          Status
        </p>
        <div className="mt-2">
          <StatusChips
            value={status}
            label="Booking status"
            onChange={setStatus}
          />
        </div>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Notes <span className="font-normal normal-case tracking-normal">(optional)</span>
        <textarea
          className={`${inputClass} min-h-20 py-3`}
          rows={2}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>
      {error ? (
        <p className="text-sm text-link" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="btn btn-primary">
          {existing ? "Save changes" : "Add to itinerary"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
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
}: {
  item: TripItem;
  days: TripDay[];
  onStatus: (status: TripItemStatus) => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const when = itemWhen(item, days);
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-heading">{item.title}</p>
          {when ? <p className="mt-0.5 text-sm text-muted">{when}</p> : null}
          {item.url ? (
            <OutboundLink
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block truncate text-sm text-link hover:text-accent"
            >
              {item.url.replace(/^https?:\/\//, "")}
              <span className="sr-only"> (opens in a new tab)</span>
            </OutboundLink>
          ) : null}
          {item.notes ? (
            <p className="mt-1 text-sm leading-relaxed text-text">{item.notes}</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-muted transition hover:text-accent"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
      <div className="mt-3">
        <StatusChips
          value={item.status}
          label={`Status for ${item.title}`}
          onChange={onStatus}
        />
      </div>
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
    <div className="relative">
      <span
        className={`absolute -left-[1.4rem] top-1.5 size-2.5 rounded-full ${
          item.status === "booked"
            ? "bg-ink"
            : item.status === "skipped"
              ? "bg-border-strong"
              : "bg-accent"
        }`}
        aria-hidden="true"
      />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-heading">
            {item.time ? <span className="text-muted">{item.time} · </span> : null}
            {item.title}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
            {[TRIP_STATUS_LABEL[item.status], item.confirmation ? `Conf. ${item.confirmation}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {item.notes ? (
            <p className="mt-1 text-sm leading-relaxed text-text">{item.notes}</p>
          ) : null}
          {item.url ? (
            <OutboundLink
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex text-sm font-semibold text-link hover:text-accent"
            >
              Open link
              <span className="sr-only"> (opens in a new tab)</span>
            </OutboundLink>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            className="text-sm font-semibold text-accent hover:underline"
            onClick={onEdit}
          >
            Edit
          </button>
          <button
            type="button"
            className="text-sm font-semibold text-muted transition hover:text-accent"
            onClick={onRemove}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
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
  saveMode,
  guestBackup,
  onItemsChange,
  onEditTrip,
  onStartOver,
  onSaveToAccount,
  onDeclineMerge,
  onRestoreBackup,
  onRememberGuestDraft,
}: Props) {
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

  function renderTimeline(list: TripItem[]) {
    return (
      <ol className="mt-3 space-y-4 border-l border-border pl-5">
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

  const saveCopy =
    saveMode === "saving"
      ? "Saving…"
      : saveMode === "saved"
        ? "Saved to your account"
        : saveMode === "unavailable"
          ? "Account save is unavailable. This copy stays in this browser."
          : saveMode === "error"
            ? "Couldn’t save to your account. This copy stays in this browser."
            : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="font-display text-2xl font-bold tracking-tight text-heading"
          >
            {config.steps.next.heading}
          </h2>
          <p className="mt-2 font-display text-xl font-bold text-heading">
            {state.destination.trim()}
          </p>
          <p className="mt-1 text-sm text-muted">
            {[dates, travelers].filter(Boolean).join(" · ")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted md:text-base">
            {subhead}
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={onEditTrip}>
          Edit trip
        </button>
      </div>

      {saveMode === "local" ? (
        <aside className="panel-soft mt-5 px-4 py-4" aria-label="Save itinerary">
          <p className="text-sm leading-relaxed text-text">{config.checklistHint}</p>
          <Link
            href={planATripLoginHref(tripId)}
            className="btn btn-ink mt-3"
            onClick={onRememberGuestDraft}
          >
            Sign in to save this itinerary
          </Link>
        </aside>
      ) : null}

      {saveMode === "offer" ? (
        <aside className="panel-soft mt-5 px-4 py-4" aria-label="Save itinerary to your account">
          <p className="text-sm leading-relaxed text-text">
            Save this browser itinerary to your account so you can open it later?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
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
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">This itinerary stays in this browser.</p>
          <button type="button" className="btn btn-secondary" onClick={onSaveToAccount}>
            Save to your account
          </button>
        </div>
      ) : null}

      {saveCopy ? (
        <p className="mt-4 text-sm font-semibold text-heading" role="status">
          {saveCopy}
          {saveMode === "saved" ? (
            <>
              {" "}
              <Link href="/account" className="text-link hover:text-accent">
                View in account
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      {guestBackup ? (
        <aside className="panel-nested mt-4 px-4 py-3" aria-label="Browser draft">
          <p className="text-sm leading-relaxed text-text">
            You also have an unsaved itinerary for {guestBackup.state.destination.trim()} in
            this browser.
          </p>
          <button type="button" className="btn btn-secondary mt-3" onClick={onRestoreBackup}>
            Restore that draft
          </button>
        </aside>
      ) : null}

      <div className="mt-6 space-y-3">
        {partners.map((partner) => {
          const href = resolveAffiliateHref(
            partner,
            partnerUrlValues(partner, state, flexibleOn),
          );
          const laneItems = itemsForLane(items, partner);
          const adding = editor?.kind === "add-lane" && editor.laneKey === partner.key;
          return (
            <article
              key={partner.key}
              className={`rounded-xl border border-border p-4 ${
                partner.isCore ? "bg-surface-soft" : "bg-white"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="icon-tile icon-tile-sm shrink-0">
                    <NavIcon name={laneIcon(partner)} size={16} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-heading">{partner.label}</h3>
                    {partner.blurb ? (
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">
                        {partner.blurb}
                      </p>
                    ) : null}
                  </div>
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
              </div>

              {laneItems.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {laneItems.map((item) => {
                    const editing =
                      editor?.kind === "edit" &&
                      editor.place === "lane" &&
                      editor.id === item.id;
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
              ) : null}

              {adding ? (
                <BookingItemForm
                  type={itemTypeForPartner(partner)}
                  laneKey={partner.key}
                  sortOrder={nextSort}
                  days={days}
                  onCancel={() => setEditor(null)}
                  onSave={addItem}
                />
              ) : (
                <button
                  type="button"
                  className="mt-4 text-sm font-semibold text-accent hover:underline"
                  onClick={() => setEditor({ kind: "add-lane", laneKey: partner.key })}
                >
                  Add to itinerary
                </button>
              )}
            </article>
          );
        })}
      </div>

      <section className="mt-8" aria-labelledby={`${headingId}-list`}>
        <h3
          id={`${headingId}-list`}
          className="font-display text-lg font-bold text-heading"
        >
          Day by day
        </h3>
        {sorted.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Nothing saved yet. Search a partner, then add the booking you want to keep.
          </p>
        ) : null}
        {days.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Add start and end dates to split this trip into days.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {days.map((day) => {
              const dayItems = sorted
                .filter((item) => scheduledDayIndex(item, days.length) === day.index)
                .sort(compareScheduled);
              return (
                <section
                  key={day.index}
                  className="rounded-xl border border-border bg-white p-4"
                  aria-labelledby={`${headingId}-day-${day.index}`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4
                      id={`${headingId}-day-${day.index}`}
                      className="font-display font-bold text-heading"
                    >
                      {day.label}
                    </h4>
                    {day.detail ? (
                      <p className="text-sm text-muted">{day.detail}</p>
                    ) : null}
                  </div>
                  {dayItems.length === 0 ? (
                    <p className="mt-2 text-sm text-muted">Nothing on this day yet.</p>
                  ) : (
                    renderTimeline(dayItems)
                  )}
                </section>
              );
            })}
          </div>
        )}

        {unscheduled.length > 0 || days.length === 0 ? (
          <section
            className="panel-soft mt-4 px-4 py-4"
            aria-labelledby={`${headingId}-unscheduled`}
          >
            <h4
              id={`${headingId}-unscheduled`}
              className="font-display font-bold text-heading"
            >
              Unscheduled
            </h4>
            {unscheduled.length === 0 ? (
              <p className="mt-2 text-sm text-muted">
                Bookings without a day show up here.
              </p>
            ) : (
              renderTimeline(unscheduled)
            )}
          </section>
        ) : null}

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
            className="mt-4 text-sm font-semibold text-accent hover:underline"
            onClick={() => setEditor({ kind: "add-note" })}
          >
            Add a note
          </button>
        )}
      </section>

      <aside className="panel-soft mt-6 px-4 py-3" aria-label="Affiliate disclosure">
        <p className="text-sm leading-relaxed text-text">
          {config.disclosure}{" "}
          <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
            Read the full disclosure
          </Link>
          .
        </p>
      </aside>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="btn btn-secondary" onClick={onEditTrip}>
          {config.editDetailsLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onStartOver}>
          {config.startOverLabel}
        </button>
      </div>
    </>
  );
}
