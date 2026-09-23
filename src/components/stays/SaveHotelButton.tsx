"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Props = {
  hotel: {
    hotelId: string;
    name: string;
    city: string;
    neighborhood: string;
    photo: string;
    rating: number | null;
    stars: number | null;
  };
};

export function SaveHotelButton({ hotel }: Props) {
  const { data: session, status } = useSession();
  const signedIn = status === "authenticated" && Boolean(session?.user?.id);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!signedIn) {
      setSaved(false);
      setReady(true);
      return;
    }
    try {
      const response = await fetch("/api/saved-hotels");
      if (!response.ok) {
        setReady(true);
        return;
      }
      const payload = (await response.json()) as { hotels?: Array<{ hotelId: string }> };
      setSaved(Boolean(payload.hotels?.some((item) => item.hotelId === hotel.hotelId)));
      setError("");
    } catch {
      // Keep the control usable on a transient network failure.
    } finally {
      setReady(true);
    }
  }, [hotel.hotelId, signedIn]);

  useEffect(() => {
    if (status === "loading") return;
    void refresh();
  }, [refresh, status]);

  async function toggle() {
    setError("");
    if (!signedIn) {
      const callbackUrl = `${window.location.pathname}${window.location.search}`;
      window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/saved-hotels", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saved ? { hotelId: hotel.hotelId } : hotel),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error || "Could not update favorites.");
        return;
      }
      setSaved((current) => !current);
    } catch {
      setError("Could not update favorites.");
    } finally {
      setPending(false);
    }
  }

  const label = !signedIn ? "Sign in to save" : saved ? "Saved" : "Save hotel";

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
          saved
            ? "border-accent bg-accent/10 text-accent-deep"
            : "border-border bg-white text-heading hover:border-accent hover:text-accent"
        }`}
        onClick={() => void toggle()}
        disabled={pending || (!ready && signedIn)}
        aria-pressed={signedIn ? saved : undefined}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
        {pending ? (saved ? "Removing…" : "Saving…") : label}
      </button>
      {error ? <p className="text-xs text-red-600" role="status">{error}</p> : null}
    </div>
  );
}
