"use client";

import { useRef, useState } from "react";
import { Download } from "lucide-react";
import {
  buildTripPdf,
  type TripPdfDocument,
  type TripPdfSection,
  type TripPdfSource,
} from "@/lib/trip-pdf";
import { deliverTripPdf, presentReadyPdf } from "@/lib/trip-pdf-save";
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
      const document: TripPdfDocument = buildTripPdf(source, section);
      const { renderTripPdf } = await import("@/lib/trip-pdf-render");
      const bytes = await renderTripPdf(document, await loadFonts());
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
