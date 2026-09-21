"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { planATripHref, TRIPS_LIST_UNAVAILABLE } from "@/lib/trip-record";
import {
  detachActivePlan,
  renameActivePlanTitle,
} from "@/lib/trip-planner-storage";

export type AccountTripRow = {
  id: string;
  title: string;
  destination: string;
  dates: string;
};

type Props = {
  trips: AccountTripRow[];
};

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    if (typeof data.error === "string" && data.error.trim()) return data.error;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Account dashboard list of saved itineraries. */
export function MyTripsList({ trips }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(trips);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(trips);
  }, [trips]);

  const remove = async (id: string) => {
    const trip = items.find((item) => item.id === id);
    const ok = window.confirm(
      trip
        ? `Delete “${trip.title}” from your account? The copy in this browser can still be saved again.`
        : "Delete this trip from your account?",
    );
    if (!ok) return;

    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.status === 401) {
        setError("Sign in again to change your trips.");
        return;
      }
      if (res.status === 503) {
        setError(TRIPS_LIST_UNAVAILABLE);
        return;
      }
      if (!res.ok) {
        setError(await readError(res, "Could not delete that trip."));
        return;
      }
      detachActivePlan(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) setEditingId(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  const commitRename = async (id: string) => {
    const title = draftTitle.trim();
    if (!title) {
      setError("Give the trip a name.");
      return;
    }
    setError(null);
    setPendingId(id);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.status === 401) {
        setError("Sign in again to change your trips.");
        return;
      }
      if (res.status === 503) {
        setError(TRIPS_LIST_UNAVAILABLE);
        return;
      }
      if (!res.ok) {
        setError(await readError(res, "Could not rename that trip."));
        return;
      }
      const data = (await res.json()) as { trip?: { title?: string } };
      const nextTitle = data.trip?.title?.trim() || title;
      renameActivePlanTitle(id, nextTitle);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: nextTitle } : item)),
      );
      setEditingId(null);
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPendingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <div className="panel p-6 md:p-8">
        <h3 className="font-display text-lg font-bold text-heading">
          No trips saved yet
        </h3>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-text">
          Plan a trip, then save the itinerary to your account. It will show up
          here so you can open it, rename it, or delete it.
        </p>
        <Link href={planATripHref()} className="btn btn-primary mt-6">
          Plan a trip
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-link" role="status">
          {error}
        </p>
      ) : null}
      <ul className="space-y-3">
        {items.map((trip) => {
          const busy = pendingId === trip.id;
          const editing = editingId === trip.id;
          return (
            <li key={trip.id} className="panel p-4 md:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  {editing ? (
                    <form
                      className="flex flex-col gap-2 sm:flex-row sm:items-center"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void commitRename(trip.id);
                      }}
                    >
                      <label className="sr-only" htmlFor={`trip-name-${trip.id}`}>
                        Trip name
                      </label>
                      <input
                        id={`trip-name-${trip.id}`}
                        value={draftTitle}
                        maxLength={160}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        className="min-h-11 w-full rounded-lg border border-border bg-white px-3 text-sm text-heading sm:max-w-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="btn btn-ink"
                          disabled={busy}
                        >
                          {busy ? "Saving…" : "Save name"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <p className="font-display text-lg font-bold text-heading">
                        {trip.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {[trip.destination, trip.dates].filter(Boolean).join(" · ")}
                      </p>
                    </>
                  )}
                </div>
                {editing ? null : (
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href={planATripHref(trip.id)} className="btn btn-secondary">
                      Open
                    </Link>
                    <button
                      type="button"
                      className="text-sm font-semibold text-heading transition hover:text-accent disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        setError(null);
                        setDraftTitle(trip.title);
                        setEditingId(trip.id);
                      }}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      className="text-sm font-semibold text-muted transition hover:text-accent disabled:opacity-60"
                      disabled={busy}
                      onClick={() => void remove(trip.id)}
                    >
                      {busy ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
