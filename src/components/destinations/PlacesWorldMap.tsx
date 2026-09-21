"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { LatLngBounds, Map as LeafletMap, Path } from "leaflet";
import type { DestinationMapPin } from "@/data/destinations";
import {
  findMatchingDestination,
  type CountryFeatureProperties,
} from "@/lib/destination-iso";
import "leaflet/dist/leaflet.css";

export type PlacesWorldMapPlace = {
  slug: string;
  name: string;
  href: string;
  pins: DestinationMapPin[];
};

type Props = {
  places: PlacesWorldMapPlace[];
};

type CountryFeatureCollection = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: CountryFeatureProperties;
    geometry: GeoJSON.Geometry;
  }>;
};

type MapTheme = {
  dark: boolean;
  accent: string;
  accentDeep: string;
  mutedLight: string;
  border: string;
  sand: string;
};

type PathLayer = Path & {
  feature?: GeoJSON.Feature<GeoJSON.Geometry, CountryFeatureProperties>;
  getBounds?: () => LatLngBounds;
};

const OSM_TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function readMapTheme(): MapTheme {
  const root = getComputedStyle(document.documentElement);
  return {
    dark: document.documentElement.classList.contains("dark"),
    accent: root.getPropertyValue("--accent").trim() || "#d97706",
    accentDeep: root.getPropertyValue("--accent-deep").trim() || "#b45309",
    mutedLight: root.getPropertyValue("--muted-light").trim() || "#c4b8a5",
    border: root.getPropertyValue("--border").trim() || "#e0d4c2",
    sand: root.getPropertyValue("--sand").trim() || "#d9ccb8",
  };
}

function countryStyle(
  theme: MapTheme,
  visited: boolean,
  hover = false,
): {
  fillColor: string;
  fillOpacity: number;
  color: string;
  weight: number;
  interactive: boolean;
  className: string;
} {
  if (visited) {
    return {
      fillColor: theme.accent,
      fillOpacity: hover ? 0.72 : theme.dark ? 0.5 : 0.48,
      color: theme.accentDeep,
      weight: hover ? 2 : 1.4,
      interactive: true,
      className: "places-world-map-visited",
    };
  }
  return {
    fillColor: theme.dark ? theme.mutedLight : theme.sand,
    fillOpacity: theme.dark ? 0.22 : 0.35,
    color: theme.border,
    weight: 0.6,
    interactive: false,
    className: "places-world-map-muted",
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pinPopupHtml(
  pin: DestinationMapPin,
  place: PlacesWorldMapPlace,
): string {
  const note = pin.note
    ? `<p class="places-world-map-popup-note">${escapeHtml(pin.note)}</p>`
    : "";
  return `<div class="places-world-map-popup">
    <strong>${escapeHtml(pin.name)}</strong>
    ${note}
    <a href="${escapeHtml(place.href)}">View ${escapeHtml(place.name)}</a>
  </div>`;
}

export default function PlacesWorldMap({ places }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const placesRef = useRef(places);
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    placesRef.current = places;
  }, [places]);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let map: LeafletMap | null = null;
    let observer: MutationObserver | null = null;

    async function init() {
      const [{ default: L }, geoMod] = await Promise.all([
        import("leaflet"),
        import("@/content/geo/world-countries.json"),
      ]);
      if (cancelled || !container) return;

      const geojson = (geoMod.default ?? geoMod) as CountryFeatureCollection;

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

      const instance = L.map(container, {
        // Same as DestinationMap: the map sits in a long scrolling page, so
        // wheel zoom would steal scroll. Pan, pinch, and +/- still work.
        scrollWheelZoom: false,
        attributionControl: true,
        minZoom: 2,
        maxZoom: 12,
        worldCopyJump: false,
        maxBounds: L.latLngBounds([-85, -180], [85, 180]),
        maxBoundsViscosity: 0.8,
      }).setView([30, -50], 3);
      if (cancelled) {
        instance.remove();
        return;
      }
      map = instance;

      let theme = readMapTheme();

      L.tileLayer(OSM_TILES, {
        attribution: OSM_ATTR,
        maxZoom: 12,
        noWrap: true,
      }).addTo(instance);

      const placeForFeature = (props: CountryFeatureProperties | undefined) =>
        findMatchingDestination(placesRef.current, props);

      const geoLayer = L.geoJSON(geojson, {
        style: (feature) => {
          const visited = Boolean(
            placeForFeature(feature?.properties as CountryFeatureProperties),
          );
          return {
            ...countryStyle(theme, visited),
            bubblingMouseEvents: false,
          };
        },
        onEachFeature: (feature, layer) => {
          const place = placeForFeature(
            feature.properties as CountryFeatureProperties,
          );
          if (!place) return;

          layer.on("mouseover", () => {
            const path = layer as Path;
            path.setStyle({
              ...countryStyle(theme, true, true),
              bubblingMouseEvents: false,
            });
            path.bringToFront();
          });
          layer.on("mouseout", () => {
            (layer as Path).setStyle({
              ...countryStyle(theme, true),
              bubblingMouseEvents: false,
            });
          });
          layer.on("click", (event) => {
            L.DomEvent.stopPropagation(event);
            routerRef.current.push(place.href);
          });
        },
      }).addTo(instance);

      const pinPane = instance.createPane("trip-pins");
      pinPane.style.zIndex = "650";

      const bounds = L.latLngBounds([]);
      const placesWithPins = new Set<string>();

      for (const place of placesRef.current) {
        for (const pin of place.pins) {
          const marker = L.marker([pin.lat, pin.lng], {
            icon,
            pane: "trip-pins",
            bubblingMouseEvents: false,
            riseOnHover: true,
          })
            .addTo(instance)
            .bindPopup(pinPopupHtml(pin, place));
          marker.on("click", (event) => {
            L.DomEvent.stopPropagation(event);
          });
          bounds.extend([pin.lat, pin.lng]);
          placesWithPins.add(place.slug);
        }
      }

      // Fit to trip pins so Iceland stays readable. Full Canada/US polygons
      // include Alaska/Arctic and zoom the world so far that visited spots vanish.
      // Destinations with no pins still contribute their country bounds.
      geoLayer.eachLayer((layer) => {
        const path = layer as PathLayer;
        const place = placeForFeature(path.feature?.properties);
        if (!place || placesWithPins.has(place.slug) || !path.getBounds) return;
        const layerBounds = path.getBounds();
        if (layerBounds.isValid()) bounds.extend(layerBounds);
      });

      if (bounds.isValid()) {
        instance.fitBounds(bounds, { padding: [48, 48], maxZoom: 4 });
      }

      const applyTheme = () => {
        theme = readMapTheme();
        geoLayer.eachLayer((layer) => {
          const path = layer as PathLayer;
          const visited = Boolean(
            findMatchingDestination(
              placesRef.current,
              path.feature?.properties,
            ),
          );
          path.setStyle({
            ...countryStyle(theme, visited),
            bubblingMouseEvents: false,
          });
        });
      };

      observer = new MutationObserver(applyTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      requestAnimationFrame(() => instance.invalidateSize());
    }

    void init();

    return () => {
      cancelled = true;
      observer?.disconnect();
      if (map) {
        map.remove();
        map = null;
      }
    };
  }, []);

  return (
    <section className="mt-10" aria-labelledby="places-world-map-heading">
      <h2
        id="places-world-map-heading"
        className="font-display text-title text-heading"
      >
        Places on the map
      </h2>
      <p className="mt-1 text-xs text-muted">
        Visited countries in orange — tap a country or a pin to explore that
        journal.
      </p>
      <div className="panel mt-5 max-w-full overflow-hidden p-0">
        <div
          ref={containerRef}
          className="places-world-map h-[18rem] w-full max-w-full sm:h-[26rem] md:h-[32rem] lg:h-[36rem]"
          role="application"
          aria-label="Interactive world map of visited places"
        />
      </div>
    </section>
  );
}
