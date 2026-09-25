"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  fallbackDestinationPhoto,
  type DestinationPhoto,
} from "@/lib/destination-photo";

export function TripDestinationHero({ destination, title, headingId, meta, actions, back, fallbackImage }: {
  destination: string;
  title: string;
  headingId: string;
  meta: string;
  actions?: ReactNode;
  /** Overlaid on the photo, on the same row as the trip actions. */
  back?: ReactNode;
  fallbackImage?: { url: string; alt: string };
}) {
  const [result, setResult] = useState<{ destination: string; photo: DestinationPhoto } | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const fallback = fallbackDestinationPhoto(destination, fallbackImage);
  const remote = result?.destination === destination ? result.photo : null;
  const photo = remote && !failedImages.has(remote.image) ? remote : !failedImages.has(fallback.image) ? fallback : null;

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/destination-photo?${new URLSearchParams({ destination })}`, { signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((body) => {
        if (!controller.signal.aborted && body?.photo) setResult({ destination, photo: body.photo });
      })
      .catch(() => { /* The local destination artwork remains available. */ });
    return () => controller.abort();
  }, [destination]);

  return (
    <div className="plan-trip-hero">
      {photo ? (
        // Unsplash requires hotlinking the returned image URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img className="plan-trip-hero-image" src={photo.image} alt={photo.alt ?? `View of ${destination}`} fetchPriority="high" onError={() => setFailedImages((previous) => new Set(previous).add(photo.image))} />
      ) : null}
      <div className="plan-trip-hero-shade" aria-hidden="true" />
      <div className="plan-trip-hero-frame">
        {back || actions ? (
          <div className="plan-trip-hero-bar">
            {back ? <div className="plan-trip-hero-back">{back}</div> : null}
            {actions ? <div className="plan-trip-hero-actions" role="group" aria-label="Trip actions">{actions}</div> : null}
          </div>
        ) : null}
        <div className="plan-trip-hero-content">
          <p className="plan-trip-hero-kicker">Your trip</p>
          <h2 id={headingId} className="plan-trip-hero-title">{title}</h2>
          <p className="plan-trip-hero-meta">{meta}</p>
        </div>
        {photo && photo.source !== "Trip planner image" ? <p className="plan-trip-hero-credit">
          {photo.source === "Alex Journeys artwork" ? "Artwork by " : "Photo by "}
          <a href={photo.photographerUrl} target={photo.photographerUrl.startsWith("/") ? undefined : "_blank"} rel={photo.photographerUrl.startsWith("/") ? undefined : "noopener noreferrer"}>{photo.photographer}</a>
          {photo.source === "Alex Journeys artwork" ? null : <> on <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.source}</a> · {photo.license}</>}
        </p> : null}
      </div>
    </div>
  );
}
