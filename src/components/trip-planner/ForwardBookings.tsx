"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { NavIcon } from "@/components/icons/NavIcon";
import { plan } from "@/components/trip-planner/density";
import {
  formatInboundWhen,
  laneKeyForImport,
  suggestionToTripItem,
  type InboundMailboxView,
  type InboundSuggestion,
} from "@/lib/inbound-parse";
import { planATripLoginHref, type TripDay, type TripItem } from "@/lib/trip-record";
import type { TripPlannerPartner } from "@/lib/trip-planner-model";

type Props = {
  headingId: string;
  tripId: string | null;
  days: TripDay[];
  partners: TripPlannerPartner[];
  nextSort: number;
  onAddItem: (item: TripItem) => void;
  onRemember: () => void;
};

const TYPE_LABEL = {
  flight: "Flight",
  hotel: "Stay",
  car: "Car",
  activity: "Experience",
  other: "Booking",
} as const;

function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "Link";
  }
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string" && body.error.trim()) return body.error;
  } catch {
    /* ignore */
  }
  return fallback;
}

function SuggestionCard({
  suggestion,
  busy,
  onAdd,
  onDismiss,
}: {
  suggestion: InboundSuggestion;
  busy: boolean;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const when = formatInboundWhen(suggestion);
  return (
    <li className={`${plan.inset} plan-stack-tight border border-border bg-white`}>
      <p className={plan.label}>
        {TYPE_LABEL[suggestion.type]} · From email
      </p>
      <p className={plan.h4}>{suggestion.title}</p>
      {when ? <p className={`${plan.caption} text-muted`}>{when}</p> : null}
      {suggestion.subject && suggestion.subject !== suggestion.title ? (
        <p className={`${plan.body} text-text`}>{suggestion.subject}</p>
      ) : null}
      {suggestion.url ? (
        <a
          href={suggestion.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${plan.textBtn} self-start text-link hover:text-accent`}
        >
          {hostOf(suggestion.url)}
        </a>
      ) : null}
      <div className="plan-actions plan-actions-inline">
        <button type="button" className="btn btn-ink disabled:opacity-60" disabled={busy} onClick={onAdd}>
          Add to itinerary
        </button>
        <button type="button" className="btn btn-secondary disabled:opacity-60" disabled={busy} onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </li>
  );
}

export function ForwardBookings({
  headingId,
  tripId,
  days,
  partners,
  nextSort,
  onAddItem,
  onRemember,
}: Props) {
  const { status } = useSession();
  const [account, setAccount] = useState<InboundMailboxView | null>(null);
  const [trip, setTrip] = useState<InboundMailboxView | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replaceArmed, setReplaceArmed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accountRes = await fetch("/api/trips/forward", { cache: "no-store" });
      if (accountRes.status === 401) {
        setAccount(null);
        setTrip(null);
        setError("Sign in to get a forward address.");
        return;
      }
      if (!accountRes.ok) {
        setError(await readError(accountRes, "Could not load your forward address."));
        return;
      }
      const accountBody = (await accountRes.json()) as { mailbox?: InboundMailboxView };
      setAccount(accountBody.mailbox ?? null);

      if (!tripId) {
        setTrip(null);
        return;
      }
      const tripRes = await fetch(`/api/trips/${encodeURIComponent(tripId)}/forward`, {
        cache: "no-store",
      });
      if (!tripRes.ok) {
        setTrip(null);
        setError(await readError(tripRes, "Could not load this trip’s forward address."));
        return;
      }
      const tripBody = (await tripRes.json()) as { mailbox?: InboundMailboxView };
      setTrip(tripBody.mailbox ?? null);
    } catch {
      setError("Could not load your forward address.");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    if (status !== "authenticated") return;
    void load();
  }, [status, load]);

  const primary = tripId ? trip : account;
  const extraSuggestions = tripId ? (account?.suggestions ?? []) : [];

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const field = document.createElement("textarea");
      field.value = address;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  }

  async function patchMailbox(patch: { enabled?: boolean; rotate?: boolean }) {
    if (!primary) return;
    setActionError(null);
    setBusyId("mailbox");
    const path = tripId ? `/api/trips/${encodeURIComponent(tripId)}/forward` : "/api/trips/forward";
    try {
      const response = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        setActionError(await readError(response, "Could not update that address."));
        return;
      }
      const body = (await response.json()) as { mailbox?: InboundMailboxView };
      if (body.mailbox) {
        if (tripId) setTrip(body.mailbox);
        else setAccount(body.mailbox);
      }
      setReplaceArmed(false);
    } catch {
      setActionError("Could not update that address.");
    } finally {
      setBusyId(null);
    }
  }

  async function resolveSuggestion(
    scope: "account" | "trip",
    suggestion: InboundSuggestion,
    action: "add" | "dismiss",
  ) {
    setActionError(null);
    setBusyId(suggestion.id);
    const path =
      scope === "trip" && tripId
        ? `/api/trips/${encodeURIComponent(tripId)}/forward/imports/${encodeURIComponent(suggestion.id)}`
        : `/api/trips/forward/imports/${encodeURIComponent(suggestion.id)}`;
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        setActionError(await readError(response, "Could not update that suggestion."));
        return;
      }
      if (action === "add") {
        onAddItem(
          suggestionToTripItem(suggestion, {
            sortOrder: nextSort,
            days,
            laneKey: laneKeyForImport(suggestion.type, partners),
          }),
        );
      }
      const drop = (mailbox: InboundMailboxView | null) =>
        mailbox
          ? {
              ...mailbox,
              suggestions: mailbox.suggestions.filter((item) => item.id !== suggestion.id),
            }
          : mailbox;
      if (scope === "trip") setTrip(drop);
      else setAccount(drop);
    } catch {
      setActionError("Could not update that suggestion.");
    } finally {
      setBusyId(null);
    }
  }

  const titleId = `${headingId}-forward`;

  return (
    <section className={`${plan.soft} plan-block`} aria-labelledby={titleId}>
      <div className="flex items-start gap-3">
        <span className="icon-tile icon-tile-sm shrink-0">
          <NavIcon name="mail" size={16} />
        </span>
        <div className="min-w-0 flex-1 plan-stack-tight">
          <h3 id={titleId} className={plan.h3}>
            Forward bookings here
          </h3>
          <p className={`${plan.prose} text-text`}>
            Forward airline, hotel, or car confirmation emails. We’ll suggest items — you
            approve before they land on the itinerary.
          </p>

          {status === "loading" || (status === "authenticated" && loading && !primary) ? (
            <p className={`${plan.caption} text-muted`} role="status">
              Loading your forward address…
            </p>
          ) : null}

          {status === "unauthenticated" ? (
            <>
              <p className={`${plan.prose} text-text`}>
                Sign in to get a forward address.
              </p>
              <div className="plan-actions plan-actions-inline">
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
            </>
          ) : null}

          {status === "authenticated" && error ? (
            <p className={`${plan.body} text-heading`} role="status">
              {error}
            </p>
          ) : null}

          {status === "authenticated" && primary ? (
            <>
              <p className={`${plan.prose} text-muted`}>
                {tripId
                  ? "This address is only for this trip."
                  : "This address is tied to your account. Save the itinerary when you want an address just for this trip."}
              </p>
              <p
                className={`${plan.input} plan-control break-all`}
                aria-label="Forwarding address"
              >
                {primary.address}
              </p>
              <div className="plan-actions plan-actions-inline">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void copyAddress(primary.address)}
                >
                  {copied ? "Copied" : "Copy address"}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busyId === "mailbox"}
                  onClick={() => void patchMailbox({ enabled: !primary.enabled })}
                >
                  {primary.enabled ? "Turn off forwarding" : "Turn forwarding back on"}
                </button>
                {replaceArmed ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-ink"
                      disabled={busyId === "mailbox"}
                      onClick={() => void patchMailbox({ rotate: true })}
                    >
                      Replace address
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setReplaceArmed(false)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setReplaceArmed(true)}
                  >
                    Get a new address
                  </button>
                )}
              </div>
              {copied ? (
                <p className={`${plan.caption} font-semibold text-heading`} role="status">
                  Address copied.
                </p>
              ) : null}
              {replaceArmed ? (
                <p className={`${plan.prose} text-muted`}>
                  The current address will stop accepting mail.
                </p>
              ) : null}
              {!primary.enabled ? (
                <p className={`${plan.prose} text-muted`}>
                  Forwarding is off. New mail to this address won’t be suggested.
                </p>
              ) : null}

              <h4 className={`${plan.h4} plan-follow`}>
                Suggested imports
              </h4>
              {primary.suggestions.length === 0 ? (
                <p className={`${plan.prose} text-muted`}>
                  Nothing waiting. Forward a confirmation, then add or dismiss what we find.
                </p>
              ) : (
                <ul className="plan-stack-tight" aria-label="Suggested imports">
                  {primary.suggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      busy={busyId !== null}
                      onAdd={() =>
                        void resolveSuggestion(tripId ? "trip" : "account", suggestion, "add")
                      }
                      onDismiss={() =>
                        void resolveSuggestion(tripId ? "trip" : "account", suggestion, "dismiss")
                      }
                    />
                  ))}
                </ul>
              )}

              {extraSuggestions.length > 0 ? (
                <>
                  <h4 className={`${plan.h4} plan-follow`}>
                    Also waiting on your account address
                  </h4>
                  <ul className="plan-stack-tight" aria-label="Account suggestions">
                    {extraSuggestions.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion.id}
                        suggestion={suggestion}
                        busy={busyId !== null}
                        onAdd={() => void resolveSuggestion("account", suggestion, "add")}
                        onDismiss={() => void resolveSuggestion("account", suggestion, "dismiss")}
                      />
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}

          {actionError ? (
            <p className={`${plan.body} text-heading`} role="status">
              {actionError}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
