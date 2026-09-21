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
  createTripItem,
  isSafeHttpUrl,
  itemsForLane,
  itemTypeForPartner,
  planATripLoginHref,
  TRIP_ITEM_STATUSES,
  TRIP_STATUS_LABEL,
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

function AddItemForm({
  type,
  laneKey,
  sortOrder,
  onAdd,
  onCancel,
}: {
  type: TripItemType;
  laneKey?: string;
  sortOrder: number;
  onAdd: (item: TripItem) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="mt-4 space-y-3 border-t border-border pt-4"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmedUrl = url.trim();
        if (trimmedUrl && !isSafeHttpUrl(trimmedUrl)) {
          setError("Paste a full http:// or https:// link.");
          return;
        }
        if (!trimmedUrl && !title.trim() && !notes.trim()) {
          setError("Add a link, a title, or a note.");
          return;
        }
        onAdd(
          createTripItem({
            type,
            laneKey,
            sortOrder,
            title,
            url: trimmedUrl,
            notes,
          }),
        );
      }}
    >
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Link
        <input
          className={inputClass}
          inputMode="url"
          placeholder="Paste the link from your search"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setError(null);
          }}
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted">
        Title <span className="font-normal normal-case tracking-normal">(optional)</span>
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
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
          Add to itinerary
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
  onStatus,
  onRemove,
}: {
  item: TripItem;
  onStatus: (status: TripItemStatus) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display font-bold text-heading">{item.title}</p>
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
        <button
          type="button"
          className="text-sm font-semibold text-muted transition hover:text-accent"
          onClick={onRemove}
        >
          Remove
        </button>
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
  const [openLane, setOpenLane] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const dates = dateSummary(state, flexibleOn);
  const travelers = travelerSummary(state);
  const sorted = [...items].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.updatedAt.localeCompare(b.updatedAt),
  );
  const nextSort = sorted.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;

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
          const adding = openLane === partner.key;
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
                  {laneItems.map((item) => (
                    <li key={item.id}>
                      <ItemCard
                        item={item}
                        onStatus={(status) => updateItem(item.id, { status })}
                        onRemove={() => removeItem(item.id)}
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {adding ? (
                <AddItemForm
                  type={itemTypeForPartner(partner)}
                  laneKey={partner.key}
                  sortOrder={nextSort}
                  onCancel={() => setOpenLane(null)}
                  onAdd={(item) => {
                    onItemsChange([...items, item]);
                    setOpenLane(null);
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="mt-4 text-sm font-semibold text-accent hover:underline"
                  onClick={() => {
                    setNoteOpen(false);
                    setOpenLane(partner.key);
                  }}
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
          Itinerary
        </h3>
        {sorted.length === 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Nothing saved yet. Search a partner, then paste the link you want to keep.
          </p>
        ) : (
          <ol className="mt-4 space-y-4 border-l border-border pl-5">
            {sorted.map((item) => (
              <li key={item.id} className="relative">
                <span
                  className={`absolute -left-[1.45rem] top-1.5 size-2.5 rounded-full ${
                    item.status === "booked"
                      ? "bg-ink"
                      : item.status === "skipped"
                        ? "bg-border-strong"
                        : "bg-accent"
                  }`}
                  aria-hidden="true"
                />
                <p className="font-display font-bold text-heading">{item.title}</p>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
                  {TRIP_STATUS_LABEL[item.status]}
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
              </li>
            ))}
          </ol>
        )}

        {noteOpen ? (
          <AddItemForm
            type="note"
            sortOrder={nextSort}
            onCancel={() => setNoteOpen(false)}
            onAdd={(item) => {
              onItemsChange([...items, item]);
              setNoteOpen(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-accent hover:underline"
            onClick={() => {
              setOpenLane(null);
              setNoteOpen(true);
            }}
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
