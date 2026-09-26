"use client";

import { ChevronLeft, ChevronRight, Images, LayoutGrid, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent, type UIEvent } from "react";
import { createPortal } from "react-dom";
import type { StayPhoto } from "@/lib/stays";

type Slide = StayPhoto & { hotelFallback?: boolean };

type Props = {
  photos: StayPhoto[];
  /** Hotel hero, shown only when this room has no photos of its own. */
  fallback?: string;
  label: string;
};

function slideIndex(element: HTMLElement): number {
  const width = element.clientWidth || 1;
  return Math.max(0, Math.min(
    Math.round(element.scrollLeft / width),
    element.children.length - 1,
  ));
}

function scrollToIndex(element: HTMLElement | null, index: number, behavior: ScrollBehavior = "smooth") {
  if (!element) return;
  const reduce =
    behavior === "smooth" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const width = element.clientWidth || 0;
  element.scrollTo({ left: width * index, behavior: reduce ? "auto" : behavior });
}

export function StayRoomGallery({ photos, fallback = "", label }: Props) {
  const titleId = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const viewerScroller = useRef<HTMLDivElement>(null);
  const indexRef = useRef(0);
  const viewerIndexRef = useRef(0);
  const pendingScroll = useRef<number | null>(null);
  const pointer = useRef({ x: 0, moved: false });
  const stripTarget = useRef<number | null>(null);
  const viewerTarget = useRef<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const roomPhotos = photos.filter((photo) => Boolean(photo.url));
  const slides: Slide[] = roomPhotos.length
    ? roomPhotos
    : fallback
      ? [{ url: fallback, caption: "", hotelFallback: true }]
      : [];
  const many = slides.length > 1;
  const slideCount = slides.length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        setGrid(false);
        return;
      }
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const delta = event.key === "ArrowRight" ? 1 : -1;
      const next = Math.max(0, Math.min(viewerIndexRef.current + delta, slideCount - 1));
      viewerIndexRef.current = next;
      indexRef.current = next;
      setViewerIndex(next);
      setIndex(next);
      setGrid(false);
      viewerTarget.current = next;
      stripTarget.current = next;
      requestAnimationFrame(() => {
        scrollToIndex(viewerScroller.current, next);
        scrollToIndex(scroller.current, next);
      });
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, slideCount]);

  useEffect(() => {
    if (!open) {
      returnFocus.current?.focus();
      return;
    }
    const frame = requestAnimationFrame(() => closeButton.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || grid || pendingScroll.current == null) return;
    const next = pendingScroll.current;
    pendingScroll.current = null;
    viewerTarget.current = next;
    const frame = requestAnimationFrame(() => {
      scrollToIndex(viewerScroller.current, next, "auto");
    });
    return () => cancelAnimationFrame(frame);
  }, [open, grid, viewerIndex]);

  function moveViewer(delta: number) {
    const next = Math.max(0, Math.min(viewerIndexRef.current + delta, slideCount - 1));
    viewerIndexRef.current = next;
    indexRef.current = next;
    setViewerIndex(next);
    setIndex(next);
    setGrid(false);
    viewerTarget.current = next;
    stripTarget.current = next;
    requestAnimationFrame(() => {
      scrollToIndex(viewerScroller.current, next);
      scrollToIndex(scroller.current, next);
    });
  }

  function openAt(next: number, showGrid = false) {
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    viewerIndexRef.current = next;
    indexRef.current = next;
    pendingScroll.current = showGrid ? null : next;
    setViewerIndex(next);
    setIndex(next);
    setGrid(showGrid);
    setOpen(true);
  }

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    stripTarget.current = null;
    pointer.current = { x: event.clientX, moved: false };
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (Math.abs(event.clientX - pointer.current.x) > 8) pointer.current.moved = true;
  }

  function onStripScroll(event: UIEvent<HTMLDivElement>, viewer = false) {
    const next = slideIndex(event.currentTarget);
    const target = viewer ? viewerTarget : stripTarget;
    if (target.current != null && next !== target.current) return;
    target.current = null;
    if (viewer) {
      viewerIndexRef.current = next;
      indexRef.current = next;
      setViewerIndex(next);
      setIndex(next);
      return;
    }
    indexRef.current = next;
    setIndex(next);
  }

  function showStripPhoto(next: number) {
    const clamped = Math.max(0, Math.min(next, slideCount - 1));
    indexRef.current = clamped;
    setIndex(clamped);
    stripTarget.current = clamped;
    scrollToIndex(scroller.current, clamped);
  }

  function onStripKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!many) return;
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    showStripPhoto(indexRef.current + delta);
  }

  if (slides.length === 0) {
    return (
      <div className="grid h-full min-h-0 place-items-center bg-surface px-3 text-center text-sm text-muted">
        <div>
          <Images className="mx-auto mb-2 h-6 w-6" aria-hidden="true" />
          <p>No room photos</p>
        </div>
      </div>
    );
  }

  const active = slides[index] ?? slides[0];

  return (
    <div className="relative h-full min-h-0 bg-surface">
      <div
        ref={scroller}
        className="absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        tabIndex={many ? 0 : undefined}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${label} photos`}
        onScroll={(event) => onStripScroll(event)}
        onKeyDown={onStripKey}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        {slides.map((photo, photoIndex) => (
          <button
            key={`${photo.url}-${photoIndex}`}
            type="button"
            className="relative h-full min-w-full snap-center"
            onClick={() => {
              if (pointer.current.moved) return;
              openAt(photoIndex);
            }}
            aria-label={
              photo.hotelFallback
                ? `Hotel photo used because ${label} has no room photos. Open photo.`
                : `Open photo ${photoIndex + 1} of ${slides.length} for ${label}`
            }
          >
            <RoomSlide photo={photo} label={label} eager={photoIndex === 0} />
          </button>
        ))}
      </div>

      {active?.hotelFallback ? (
        <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-heading/85 px-3 py-1.5 text-xs font-semibold text-on-solid">
          Hotel photo
        </span>
      ) : null}

      {many ? (
        <>
          <p className="pointer-events-none absolute top-3 right-3 rounded-full bg-heading/85 px-2.5 py-1 text-xs font-semibold text-on-solid">
            {index + 1}/{slides.length}
          </p>
          <button
            type="button"
            className="absolute bottom-3 left-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-heading/85 px-3 text-xs font-semibold text-on-solid"
            onClick={() => openAt(indexRef.current, true)}
          >
            <Images className="h-4 w-4" aria-hidden="true" />
            All {slides.length} photos
          </button>
          <button
            type="button"
            className="absolute top-1/2 left-2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-heading/80 text-on-solid disabled:opacity-40 md:grid"
            aria-label="Previous photo"
            disabled={index === 0}
            onClick={() => showStripPhoto(indexRef.current - 1)}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-2 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-heading/80 text-on-solid disabled:opacity-40 md:grid"
            aria-label="Next photo"
            disabled={index >= slides.length - 1}
            onClick={() => showStripPhoto(indexRef.current + 1)}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      ) : null}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[220] flex flex-col bg-near-black text-on-solid"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-5">
                <button
                  type="button"
                  className="inline-flex min-h-11 shrink-0 items-center px-2 text-sm font-semibold whitespace-nowrap"
                  onClick={() => {
                    setOpen(false);
                    setGrid(false);
                  }}
                >
                  Back to room
                </button>
                <p id={titleId} className="min-w-0 flex-1 truncate text-center text-sm font-semibold">
                  {label} · {viewerIndex + 1}/{slides.length}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  {slides.length > 1 ? (
                    <button
                      type="button"
                      className="grid h-11 w-11 place-items-center rounded-full bg-white/10"
                      aria-pressed={grid}
                      aria-label={grid ? "Show one photo" : "Show all photos"}
                      onClick={() => setGrid((value) => !value)}
                    >
                      <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    ref={closeButton}
                    className="grid h-11 w-11 place-items-center rounded-full bg-white/10"
                    aria-label="Close photos"
                    onClick={() => {
                      setOpen(false);
                      setGrid(false);
                    }}
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>
              </div>

              {grid ? (
                <div className="grid flex-1 grid-cols-2 content-start gap-2 overflow-y-auto p-3 sm:grid-cols-3 sm:p-5">
                  {slides.map((photo, photoIndex) => (
                    <button
                      key={`${photo.url}-grid-${photoIndex}`}
                      type="button"
                      className="relative aspect-[4/3] overflow-hidden rounded-lg bg-white/10"
                      aria-label={`Show photo ${photoIndex + 1} of ${slides.length}`}
                      onClick={() => {
                        viewerIndexRef.current = photoIndex;
                        indexRef.current = photoIndex;
                        pendingScroll.current = photoIndex;
                        setViewerIndex(photoIndex);
                        setIndex(photoIndex);
                        setGrid(false);
                      }}
                    >
                      <RoomSlide photo={photo} label={label} eager={photoIndex < 4} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="relative min-h-0 flex-1">
                  <div
                    ref={viewerScroller}
                    className="flex h-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    onPointerDown={() => {
                      viewerTarget.current = null;
                    }}
                    onScroll={(event) => onStripScroll(event, true)}
                  >
                    {slides.map((photo, photoIndex) => (
                      <div
                        key={`${photo.url}-viewer-${photoIndex}`}
                        className="flex h-full min-w-full snap-center items-center justify-center px-3 pb-6 sm:px-16"
                      >
                        <RoomSlide photo={photo} label={label} eager contain />
                      </div>
                    ))}
                  </div>
                  {many ? (
                    <>
                      <button
                        type="button"
                        className="absolute top-1/2 left-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 disabled:opacity-40 sm:left-5"
                        aria-label="Previous photo"
                        disabled={viewerIndex === 0}
                        onClick={() => moveViewer(-1)}
                      >
                        <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        className="absolute top-1/2 right-2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 disabled:opacity-40 sm:right-5"
                        aria-label="Next photo"
                        disabled={viewerIndex >= slides.length - 1}
                        onClick={() => moveViewer(1)}
                      >
                        <ChevronRight className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </>
                  ) : null}
                </div>
              )}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function RoomSlide({
  photo,
  label,
  eager,
  contain = false,
}: {
  photo: Slide;
  label: string;
  eager: boolean;
  contain?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <span className="relative block h-full w-full">
      {loaded ? null : <span className="absolute inset-0 animate-pulse bg-surface" aria-hidden="true" />}
      {/* Room CDNs are not a fixed host list. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt={photo.caption || `${label} photo`}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className={`h-full w-full transition duration-300 ${contain ? "object-contain" : "object-cover"} ${
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-sm"
        }`}
        onLoad={() => setLoaded(true)}
        onError={(event) => {
          const img = event.currentTarget;
          if (photo.fallbackUrl && img.dataset.fallback !== "1") {
            img.dataset.fallback = "1";
            img.src = photo.fallbackUrl;
            return;
          }
          setLoaded(true);
          img.classList.add("invisible");
        }}
      />
    </span>
  );
}
