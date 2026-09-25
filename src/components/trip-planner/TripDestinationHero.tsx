"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  fallbackDestinationPhoto,
  type DestinationPhoto,
} from "@/lib/destination-photo";

export function TripDestinationHero({ destination, title, headingId, meta, actions, back, status, fallbackImage }: {
  destination: string;
  title: string;
  headingId: string;
  meta: string;
  actions?: ReactNode;
  /** Short link kept on the meta line. */
  back?: ReactNode;
  /** One gray line under the meta, such as local-save status. */
  status?: ReactNode;
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

  const credit = photo && photo.source !== "Trip planner image" ? (
    <p className="plan-trip-summary-credit">
      {photo.source === "Alex Journeys artwork" ? "Artwork by " : "Photo by "}
      <a href={photo.photographerUrl} target={photo.photographerUrl.startsWith("/") ? undefined : "_blank"} rel={photo.photographerUrl.startsWith("/") ? undefined : "noopener noreferrer"}>{photo.photographer}</a>
      {photo.source === "Alex Journeys artwork" ? null : <> on <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">{photo.source}</a> · {photo.license}</>}
    </p>
  ) : null;

  return (
    <div className="plan-trip-hero plan-trip-summary">
      <div className="plan-trip-summary-photo">
        {photo ? (
          // Unsplash requires hotlinking the returned image URL.
          // eslint-disable-next-line @next/next/no-img-element
          <img className="plan-trip-hero-image" src={photo.image} alt={photo.alt ?? `View of ${destination}`} fetchPriority="high" onError={() => setFailedImages((previous) => new Set(previous).add(photo.image))} />
        ) : null}
      </div>
      <div className="plan-trip-summary-copy">
        <div className="plan-trip-summary-title-row">
          <h2 id={headingId} className="plan-trip-hero-title">{title}</h2>
          {actions ? <div className="plan-trip-hero-actions" role="group" aria-label="Trip actions">{actions}</div> : null}
        </div>
        {meta || back ? (
          <p className="plan-trip-hero-meta">
            {meta}
            {meta && back ? <span aria-hidden="true"> · </span> : null}
            {back}
          </p>
        ) : null}
        {status}
        {credit}
      </div>
    </div>
  );
}
