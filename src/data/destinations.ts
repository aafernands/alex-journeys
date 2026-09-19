/**
 * Past-trip destinations for Fernandes Journeys.
 * Related blog posts are linked via destinations[] on each post.
 */

export type DestinationCountry = {
  slug: string;
  name: string;
  region: string;
  continent: string;
  blurb: string;
};

export type DestinationRegion = {
  id: string;
  name: string;
  countries: DestinationCountry[];
};

export type DestinationContinent = {
  id: string;
  name: string;
  /** Flat country list (Europe) or nested regions (Americas) */
  regions?: DestinationRegion[];
  countries?: DestinationCountry[];
};

export const destinationsTree: DestinationContinent[] = [
  {
    id: "europe",
    name: "Europe",
    countries: [
      {
        slug: "iceland",
        name: "Iceland",
        region: "Europe",
        continent: "Europe",
        blurb:
          "Ring-road miles, geothermal pools, and light that barely quit — notes and photos from a week in the land of fire and ice.",
      },
    ],
  },
  {
    id: "americas",
    name: "Americas",
    regions: [
      {
        id: "north-america",
        name: "North America",
        countries: [
          {
            slug: "canada",
            name: "Canada",
            region: "North America",
            continent: "Americas",
            blurb:
              "Wide skies, city weekends, and quiet stretches of road — starting with a packed 48 hours in Toronto.",
          },
          {
            slug: "united-states",
            name: "United States",
            region: "North America",
            continent: "Americas",
            blurb:
              "Coast-to-coast fragments — mountain mornings, ski towns, wine weekends, and the roads in between.",
          },
        ],
      },
      {
        id: "south-america",
        name: "South America",
        countries: [
          {
            slug: "brazil",
            name: "Brazil",
            region: "South America",
            continent: "Americas",
            blurb:
              "Rhythm, coastline, and cities that keep going after midnight — including a two-week Rio itinerary.",
          },
        ],
      },
      {
        id: "central-america",
        name: "Central America",
        countries: [
          {
            slug: "mexico",
            name: "Mexico",
            region: "Central America",
            continent: "Americas",
            blurb:
              "Markets, plazas, Caribbean water — including five packed days in Cancún.",
          },
        ],
      },
    ],
  },
];

export function getAllDestinations(): DestinationCountry[] {
  const list: DestinationCountry[] = [];
  for (const continent of destinationsTree) {
    if (continent.countries) list.push(...continent.countries);
    if (continent.regions) {
      for (const region of continent.regions) {
        list.push(...region.countries);
      }
    }
  }
  return list;
}

export function getDestinationBySlug(
  slug: string,
): DestinationCountry | undefined {
  return getAllDestinations().find((d) => d.slug === slug);
}

export const destinationSlugs = getAllDestinations().map((d) => d.slug);
