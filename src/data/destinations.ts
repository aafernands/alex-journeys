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
  image: string;
  imageAlt: string;
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
        image:
          "https://i0.wp.com/alexjournly.com/wp-content/uploads/2025/07/IMG_6855-scaled-1.webp?fit=1440%2C1920&ssl=1",
        imageAlt: "Discovering Iceland…",
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
        image:
          "https://i0.wp.com/alexjournly.com/wp-content/uploads/2024/10/img_0863-1.webp?fit=1280%2C1920&ssl=1",
        imageAlt: "Toronto, Canada",
      },
      {
        slug: "united-states",
        name: "United States",
        region: "North America",
        continent: "Americas",
        blurb:
          "Coast-to-coast fragments — mountain mornings, ski towns, wine weekends, and the roads in between.",
        image:
          "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/A60C26AF-799C-4F17-8A9F-F97A75ADB417-e1780787677499.webp?fit=1320%2C1728&ssl=1",
        imageAlt: "Maroon Bells View and Lake reflection…",
      },
      {
        slug: "mexico",
        name: "Mexico",
        region: "Central America",
        continent: "Americas",
        blurb:
          "Markets, plazas, Caribbean water — including five packed days in Cancún.",
        image:
          "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/IMG_9395-scaled.webp?fit=1440%2C1920&ssl=1",
        imageAlt: "Cancún, Mexico",
      },
      {
        slug: "brazil",
        name: "Brazil",
        region: "South America",
        continent: "Americas",
        blurb:
          "Rhythm, coastline, and cities that keep going after midnight — including a two-week Rio itinerary.",
        image:
          "https://i0.wp.com/alexjournly.com/wp-content/uploads/2025/05/img_4839.webp?fit=1440%2C1920&ssl=1",
        imageAlt: "Rio de Janeiro, Brazil",
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
