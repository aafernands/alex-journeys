"use client";

import { useEffect, useState } from "react";
import type { DestinationPhoto } from "@/lib/destination-photo";

export function TripDestinationHero({ destination, title, headingId, meta }: {
  destination: string;
  title: string;
  headingId: string;
  meta: string;
}) {
  const [result, setResult] = useState<{ destination: string; photo: DestinationPhoto } | null>(null);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const photo = result?.destination === destination && result.photo.image !== failedImage ? result.photo : null;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/destination-photo?${new URLSearchParams({ destination })}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => {
        if (!controller.signal.aborted && body?.photo) setResult({ destination, photo: body.photo });
      })
      .catch(() => { /* The neutral banner remains usable when photos are unavailable. */ });
    return () => controller.abort();
  }, [destination]);

  return (
    <div className="plan-trip-hero">
      {photo ? (
        // Unsplash requires hotlinking the returned image URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="plan-trip-hero-image" src={photo.image} alt={`View of ${destination}`} fetchPriority="high" onError={() => setFailedImage(photo.image)} />
      ) : null}
      <div className="plan-trip-hero-shade" aria-hidden="true" />
      <div className="plan-trip-hero-content">
        <p className="plan-trip-hero-kicker">Your trip</p>
        <h2 id={headingId} className="plan-trip-hero-title">{title}</h2>
        <p className="plan-trip-hero-meta">{meta}</p>
      </div>
      {photo ? <p className="plan-trip-hero-credit">
        Photo by <a href={photo.photographerUrl} target="_blank" rel="noopener noreferrer">{photo.photographer}</a> on <a href="https://unsplash.com/?utm_source=alex_journeys&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>
      </p> : null}
    </div>
  );
}
