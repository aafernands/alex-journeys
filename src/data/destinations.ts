/**
 * Past-trip destinations for Fernandes Journeys.
 * Related blog posts are linked via destinations[] on each post.
 * Nested menu: Europe → Iceland; Americas → Canada, US, Mexico, Brazil.
 */

export type DestinationCountry = {
  slug: string;
  name: string;
  region: string;
  continent: string;
  blurb: string;
};

export type DestinationContinent = {
  id: string;
  name: string;
  countries: DestinationCountry[];
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
      {
        slug: "mexico",
        name: "Mexico",
        region: "Central America",
        continent: "Americas",
        blurb:
          "Markets, plazas, Caribbean water — including five packed days in Cancún.",
      },
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
];

export function getAllDestinations(): DestinationCountry[] {
  return destinationsTree.flatMap((c) => c.countries);
}

export function getDestinationBySlug(
  slug: string,
): DestinationCountry | undefined {
  return getAllDestinations().find((d) => d.slug === slug);
}

export const destinationSlugs = getAllDestinations().map((d) => d.slug);
