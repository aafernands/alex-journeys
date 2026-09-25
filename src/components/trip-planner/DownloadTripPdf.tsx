"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { Download } from "lucide-react";
import { getSiteDesign } from "@/lib/site-design";
import {
  buildTripPdf,
  type TripPdfDocument,
  type TripPdfSection,
  type TripPdfSource,
} from "@/lib/trip-pdf";
import { deliverTripPdf, presentReadyPdf } from "@/lib/trip-pdf-save";
import type { TripItem } from "@/lib/trip-record";
import type { TripPdfFontBytes } from "@/lib/trip-pdf-render";

const CHOICES: { id: TripPdfSection; label: string; detail: string }[] = [
  { id: "itinerary", label: "Itinerary", detail: "Day by day, with times and notes" },
  { id: "packing", label: "Packing list", detail: "Checklist grouped by category" },
  { id: "bookings", label: "Bookings", detail: "Stays, flights, cars, and confirmations" },
  { id: "everything", label: "Everything", detail: "All three in one file" },
];

type ReadyFile = {
  blob: Blob;
  filename: string;
  title: string;
  label: string;
};

function logoPath(): string {
  const path = getSiteDesign().branding.logoOnLight.trim();
  return path.startsWith("/") ? path : "/brand/logo-on-light.png";
}

/** Passenger names kept with flight confirmations for this trip’s booking codes. */
function storedBookingNames(items: TripItem[]): string[] {
  if (typeof sessionStorage === "undefined") return [];
  const refs = new Set<string>();
  for (const item of items) {
    const confirmation = item.confirmation?.trim().toLowerCase();
    if (confirmation) refs.add(confirmation);
    const booking = item.url.match(/[?&]booking=([^&#]+)/i)?.[1];
    if (booking) {
      try {
        refs.add(decodeURIComponent(booking).trim().toLowerCase());
      } catch {
        refs.add(booking.trim().toLowerCase());
      }
    }
  }
  if (refs.size === 0) return [];
  try {
    const raw = sessionStorage.getItem("fj.flight-confirmations.v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const names: string[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as { confirmation?: unknown };
      const confirmation =
        record.confirmation && typeof record.confirmation === "object"
          ? (record.confirmation as Record<string, unknown>)
          : (entry as Record<string, unknown>);
      const code = String(confirmation.confirmationCode ?? "").trim().toLowerCase();
      const bookingId = String(confirmation.bookingId ?? "").trim().toLowerCase();
      const name = String(confirmation.passengerName ?? "").trim();
      if (!name) continue;
      if ((code && refs.has(code)) || (bookingId && refs.has(bookingId))) names.push(name);
    }
    return names;
  } catch {
    return [];
  }
}

async function loadFonts(): Promise<TripPdfFontBytes | undefined> {
  try {
    const load = async (path: string) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(path);
      return new Uint8Array(await response.arrayBuffer());
    };
    const [outfit, inter, interMedium] = await Promise.all([
      load("/fonts/pdf/Outfit-SemiBold.ttf"),
      load("/fonts/pdf/Inter-Regular.ttf"),
      load("/fonts/pdf/Inter-Medium.ttf"),
    ]);
    return { outfit, inter, interMedium };
  } catch {
    return undefined;
  }
}

async function loadLogo(): Promise<Uint8Array | undefined> {
  try {
    const response = await fetch(logoPath());
    if (!response.ok) return undefined;
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    return undefined;
  }
}

function closeMenu(node: HTMLElement | null) {
  const menu = node?.closest("details");
  if (menu) menu.open = false;
}

export function DownloadTripPdf({
  headingId,
  source,
  session,
}: {
  headingId: string;
  source: TripPdfSource;
  /** Changes each time the overflow menu closes, which clears a leftover file. */
  session: number;
}) {
  const { data: auth } = useSession();
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<TripPdfSection | null>(null);
  const [ready, setReady] = useState<ReadyFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seenSession, setSeenSession] = useState(session);
  if (session !== seenSession) {
    setSeenSession(session);
    setReady(null);
    setError(null);
  }

  async function choose(section: TripPdfSection) {
    if (busy) return;
    setBusy(section);
    setReady(null);
    setError(null);
    try {
      const document: TripPdfDocument = buildTripPdf(
        {
          ...source,
          travelerName: auth?.user?.name ?? "",
          bookingNames: storedBookingNames(source.items),
        },
        section,
      );
      const { renderTripPdf } = await import("@/lib/trip-pdf-render");
      const [fonts, logo] = await Promise.all([loadFonts(), loadLogo()]);
      const bytes = await renderTripPdf(document, fonts, logo);
      const blob = new Blob([Uint8Array.from(bytes)], { type: "application/pdf" });
      const outcome = await deliverTripPdf(blob, document.filename, document.shareTitle);
      if (outcome === "needs-tap") {
        setReady({
          blob,
          filename: document.filename,
          title: document.shareTitle,
          label: document.sectionLabel,
        });
        const menu = rootRef.current?.closest("details");
        if (menu) menu.open = true;
      } else if (outcome !== "cancelled") {
        closeMenu(rootRef.current);
      }
    } catch {
      setError("Couldn’t create that PDF. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="plan-trip-pdf" ref={rootRef} role="group" aria-label="Download PDF">
      <div className="plan-trip-menu-label" aria-hidden="true">
        <Download size={16} />
        Download PDF
      </div>
      {ready ? (
        <div className="plan-trip-pdf-ready">
          <p className="plan-trip-pdf-status" role="status">
            Your {ready.label.toLowerCase()} PDF is ready.
          </p>
          <button
            type="button"
            role="menuitem"
            className="plan-trip-menu-item"
            onClick={(event) => {
              presentReadyPdf(ready.blob, ready.filename, ready.title);
              closeMenu(event.currentTarget);
            }}
          >
            Save or share
          </button>
          <p className="plan-trip-pdf-hint">
            On iPhone, use the share sheet and choose Save to Files.
          </p>
        </div>
      ) : (
        CHOICES.map((choice) => (
          <button
            key={choice.id}
            type="button"
            role="menuitem"
            className="plan-trip-menu-item"
            id={`${headingId}-download-${choice.id}`}
            disabled={busy !== null}
            aria-label={`Download ${choice.label} PDF`}
            onClick={() => void choose(choice.id)}
          >
            <span className="plan-trip-menu-item-label">
              {busy === choice.id ? "Preparing…" : choice.label}
            </span>
            <span className="plan-trip-menu-item-detail">{choice.detail}</span>
          </button>
        ))
      )}
      {error ? (
        <p className="plan-trip-pdf-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
