"use client";

import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { StayPhoto } from "@/lib/stays";

type Props = {
  photos: StayPhoto[];
  hotelName: string;
};

function Photo({
  photo,
  hotelName,
  className,
}: {
  photo: StayPhoto;
  hotelName: string;
  className: string;
}) {
  return (
    // Hotel image hosts vary by Nuitee inventory.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.url}
      alt={photo.caption || hotelName}
      className={className}
      loading="eager"
      decoding="async"
      onError={(event) => {
        const img = event.currentTarget;
        if (photo.fallbackUrl && img.dataset.fallback !== "1") {
          img.dataset.fallback = "1";
          img.src = photo.fallbackUrl;
          return;
        }
        img.classList.add("invisible");
      }}
    />
  );
}

export function StayPhotoGallery({ photos, hotelName }: Props) {
  const usable = photos.filter((photo) => Boolean(photo.url));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);

  function show(index: number) {
    if (usable.length === 0) return;
    setActive(Math.max(0, Math.min(index, usable.length - 1)));
    setOpen(true);
  }

  function next() {
    setActive((current) => (current + 1) % usable.length);
  }

  function previous() {
    setActive((current) => (current - 1 + usable.length) % usable.length);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, usable.length]);

  if (usable.length === 0) {
    return (
      <section aria-label="Hotel photos" className="book-hero grid place-items-center rounded-[var(--radius-card)] bg-surface text-sm text-muted">
        <div className="text-center">
          <Images className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
          <span>No hotel photos available</span>
        </div>
      </section>
    );
  }

  return (
    <>
      <section aria-label="Hotel photos" className="relative">
        <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-[var(--radius-card)] md:hidden">
          {usable.map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => show(index)}
              className="book-hero relative min-w-full snap-center overflow-hidden rounded-[var(--radius-card)] bg-surface"
              aria-label={`Open photo ${index + 1} of ${usable.length}`}
            >
              <Photo
                photo={photo}
                hotelName={hotelName}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        <div className="book-hero hidden overflow-hidden rounded-[var(--radius-card)] bg-surface md:grid md:grid-cols-4 md:grid-rows-2 md:gap-1">
          <button
            type="button"
            onClick={() => show(0)}
            className="md:col-span-2 md:row-span-2"
            aria-label="Open hotel photo gallery"
          >
            <Photo
              photo={usable[0]}
              hotelName={hotelName}
              className="h-full w-full object-cover transition duration-200 hover:brightness-95"
            />
          </button>
          {usable.slice(1, 5).map((photo, index) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => show(index + 1)}
              className="overflow-hidden"
              aria-label={`Open photo ${index + 2} of ${usable.length}`}
            >
              <Photo
                photo={photo}
                hotelName={hotelName}
                className="h-full min-h-0 w-full object-cover transition duration-200 hover:brightness-95"
              />
            </button>
          ))}
        </div>

        {usable.length > 1 ? (
          <button
            type="button"
            onClick={() => show(0)}
            className="absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-heading/90 px-3 text-sm font-semibold text-on-solid"
          >
            <Images className="h-4 w-4" aria-hidden="true" />
            {usable.length} photos
          </button>
        ) : null}
      </section>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${hotelName} photo gallery`}
          onTouchStart={(event) => {
            touchStart.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchStart.current;
            const end = event.changedTouches[0]?.clientX ?? null;
            touchStart.current = null;
            if (start == null || end == null) return;
            const delta = end - start;
            if (Math.abs(delta) < 50) return;
            if (delta < 0) next();
            else previous();
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white sm:px-6">
            <p className="text-sm font-semibold">
              {active + 1} / {usable.length}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              aria-label="Close photo gallery"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-5 sm:px-16">
            <Photo
              photo={usable[active]}
              hotelName={hotelName}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
            {usable.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={previous}
                  className="absolute left-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:left-6"
                  aria-label="Previous photo"
                >
                  <ChevronLeft className="h-6 w-6" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  className="absolute right-3 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:right-6"
                  aria-label="Next photo"
                >
                  <ChevronRight className="h-6 w-6" aria-hidden="true" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
