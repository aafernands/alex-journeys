"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import {
  forgetPendingHotelSave,
  rememberPendingHotelSave,
  takePendingHotelSave,
  type PendingHotelSave,
} from "@/lib/pending-save";

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
  tripContext?: {
    destination: string;
    startDate: string;
    endDate: string;
    adults: number;
    children: number;
    rooms: number;
    tripId: string;
  };
};

export function SaveHotelButton({ hotel, tripContext }: Props) {
  const { data: session, status } = useSession();
  const openReaderLogin = useReaderLoginPrompt();
  const signedIn = status === "authenticated" && Boolean(session?.user?.id);
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [tripHref, setTripHref] = useState("");

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
      const payload = (await response.json()) as {
        hotels?: Array<{ hotelId: string; tripHref?: string }>;
      };
      const match = payload.hotels?.find((item) => item.hotelId === hotel.hotelId);
      setSaved(Boolean(match));
      setTripHref(match?.tripHref ?? "");
      setError("");
    } catch {
      // Keep the control usable on a transient network failure.
    } finally {
      setReady(true);
    }
  }, [hotel.hotelId, signedIn]);

  const hotelPayload = useCallback((): PendingHotelSave => {
    return {
      ...hotel,
      destination: tripContext?.destination ?? "",
      startDate: tripContext?.startDate ?? "",
      endDate: tripContext?.endDate ?? "",
      adults: tripContext?.adults,
      children: tripContext?.children,
      rooms: tripContext?.rooms,
      tripId: tripContext?.tripId ?? "",
    };
  }, [hotel, tripContext]);

  const saveHotel = useCallback(async (payload: PendingHotelSave) => {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/saved-hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error || "Could not update favorites.");
        return;
      }
      const body = (await response.json().catch(() => null)) as
        | { hotel?: { tripHref?: string } }
        | null;
      setSaved(true);
      setTripHref(body?.hotel?.tripHref ?? "");
    } catch {
      setError("Could not update favorites.");
    } finally {
      setPending(false);
    }
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    let cancelled = false;
    void (async () => {
      await refresh();
      if (cancelled || !signedIn) return;
      const pendingSave = takePendingHotelSave(hotel.hotelId);
      if (!pendingSave) return;
      await saveHotel(pendingSave);
    })();
    return () => {
      cancelled = true;
    };
  }, [hotel.hotelId, refresh, saveHotel, signedIn, status]);

  async function toggle() {
    setError("");
    if (!signedIn) {
      const payload = hotelPayload();
      rememberPendingHotelSave(payload);
      openReaderLogin({
        returnTo: `${window.location.pathname}${window.location.search}` || "/",
        intro: "Sign in to save this hotel.",
        onClose: () => forgetPendingHotelSave(hotel.hotelId),
      });
      return;
    }

    setPending(true);
    try {
      if (!saved) {
        await saveHotel(hotelPayload());
        return;
      }
      const response = await fetch("/api/saved-hotels", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hotelId: hotel.hotelId }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error || "Could not update favorites.");
        return;
      }
      setSaved(false);
      setTripHref("");
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
        className={`btn ui-btn ${saved ? "btn-ink" : "btn-secondary"} disabled:opacity-60`}
        onClick={() => void toggle()}
        disabled={pending || (!ready && signedIn)}
        aria-pressed={signedIn ? saved : undefined}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} aria-hidden="true" />
        {pending ? (saved ? "Removing…" : "Saving…") : label}
      </button>
      {saved && tripHref ? (
        <a href={tripHref} className="ui-row-action">
          Saved to trip · View trip
        </a>
      ) : null}
      {error ? <p className="ui-field-error" role="status">{error}</p> : null}
    </div>
  );
}
