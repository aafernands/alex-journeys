"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
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

export function DownloadTripPdf({
  headingId,
  source,
}: {
  headingId: string;
  source: TripPdfSource;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [busy, setBusy] = useState<TripPdfSection | null>(null);
  const [ready, setReady] = useState<ReadyFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setReady(null);
    setError(null);
  }

  function toggle() {
    setError(null);
    setOpen((current) => {
      const next = !current;
      if (next && triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setDropUp(spaceBelow < 300 && rect.top > spaceBelow);
      }
      if (!next) setReady(null);
      return next;
    });
  }

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node) || rootRef.current?.contains(target)) return;
      close();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      close();
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || ready) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>("[role='menuitem']:not(:disabled)")
      ?.focus();
  }, [open, ready]);

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
      } else if (outcome !== "cancelled") {
        close();
      }
    } catch {
      setError("Couldn’t create that PDF. Try again in a moment.");
    } finally {
      setBusy(null);
    }
  }

  function onMenuKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role='menuitem']:not(:disabled)") ??
        [],
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        event.key === "ArrowDown"
          ? items[(index + 1) % items.length]
          : items[(index - 1 + items.length) % items.length];
      next?.focus();
    }
  }

  return (
    <div className="plan-pdf-menu" ref={rootRef}>
      <button
        type="button"
        className="btn btn-secondary plan-pdf-trigger"
        id={`${headingId}-download-pdf`}
        ref={triggerRef}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={toggle}
      >
        <Download size={18} aria-hidden="true" />
        Download PDF
      </button>
      {open ? (
        <div
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label="Download PDF"
          className={`plan-pdf-options${dropUp ? " plan-pdf-options-up" : ""}`}
          onKeyDown={onMenuKeyDown}
        >
          {ready ? (
            <div className="plan-pdf-ready">
              <p className="plan-pdf-status" role="status">
                Your {ready.label.toLowerCase()} PDF is ready.
              </p>
              <button
                type="button"
                className="btn btn-primary plan-pdf-save"
                onClick={() => presentReadyPdf(ready.blob, ready.filename, ready.title)}
              >
                Save or share
              </button>
              <p className="plan-pdf-hint">
                On iPhone, use the share sheet and choose Save to Files.
              </p>
            </div>
          ) : (
            CHOICES.map((choice) => (
              <button
                key={choice.id}
                type="button"
                role="menuitem"
                disabled={busy !== null}
                onClick={() => void choose(choice.id)}
              >
                <span className="plan-pdf-option-label">
                  {busy === choice.id ? "Preparing…" : choice.label}
                </span>
                <span className="plan-pdf-option-detail">{choice.detail}</span>
              </button>
            ))
          )}
          {error ? (
            <p className="plan-pdf-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
