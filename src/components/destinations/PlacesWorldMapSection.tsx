"use client";

import dynamic from "next/dynamic";
import type { DestinationMapPin } from "@/data/destinations";

export type PlacesWorldMapPlace = {
  slug: string;
  name: string;
  href: string;
  pins: DestinationMapPin[];
};

const PlacesWorldMap = dynamic(
  () => import("@/components/destinations/PlacesWorldMap"),
  {
    ssr: false,
    loading: () => <PlacesWorldMapFallback />,
  },
);

function PlacesWorldMapFallback() {
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
          className="flex h-[18rem] w-full items-center justify-center bg-surface-soft text-sm text-muted sm:h-[26rem] md:h-[32rem] lg:h-[36rem]"
          role="status"
        >
          Loading map…
        </div>
      </div>
    </section>
  );
}

export function PlacesWorldMapSection({
  places,
}: {
  places: PlacesWorldMapPlace[];
}) {
  return <PlacesWorldMap places={places} />;
}
