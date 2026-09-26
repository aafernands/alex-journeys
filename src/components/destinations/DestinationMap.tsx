"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import type { DestinationMapData } from "@/data/destinations";
import "leaflet/dist/leaflet.css";

type Props = {
  destinationName: string;
  map: DestinationMapData;
};

export function DestinationMap({ destinationName, map }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function init() {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      // Default marker icon paths break under Next bundling — use CDN assets.
      const icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      const instance = L.map(containerRef.current, {
        scrollWheelZoom: false,
        attributionControl: true,
      }).setView(map.center, map.zoom);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(instance);

      for (const pin of map.pins) {
        const popup = pin.note
          ? `<strong>${escapeHtml(pin.name)}</strong><br/>${escapeHtml(pin.note)}`
          : `<strong>${escapeHtml(pin.name)}</strong>`;
        L.marker([pin.lat, pin.lng], { icon })
          .addTo(instance)
          .bindPopup(popup);
      }

      mapRef.current = instance;

      // Ensure tiles/size settle after layout.
      requestAnimationFrame(() => instance.invalidateSize());
    }

    void init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [ready, map]);

  return (
    <section className="mt-8 md:mt-12" aria-labelledby="destination-map-heading">
      <h2
        id="destination-map-heading"
        className="font-display text-title text-heading"
      >
        Map of {destinationName}
      </h2>
      <p className="mt-1 text-xs text-muted">
        Places from this trip — tap a pin for details
      </p>
      <div className="panel mt-4 overflow-hidden p-0">
        <div
          ref={containerRef}
          className="h-[300px] w-full sm:h-[340px]"
          role="application"
          aria-label={`Interactive map of ${destinationName}`}
        />
      </div>
    </section>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
