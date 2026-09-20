/**
 * Past-trip destinations for Fernandes Journeys.
 * Related blog posts are linked via destinations[] on each post.
 * Nested menu: Europe → Iceland; Americas → Canada, US, Mexico, Brazil.
 *
 * Optional trip fields (highlights, coverImages, etc.) are filled only from
 * facts already in linked posts — no invented hotels, dates, or itineraries.
 */

export type DestinationCoverImage = {
  src: string;
  alt: string;
};

export type DestinationCountry = {
  slug: string;
  name: string;
  region: string;
  continent: string;
  blurb: string;
  image: string;
  imageAlt: string;
  /** Short bullets drawn from the featured trip post. */
  highlights?: string[];
  /** Trip length when clear from the post title/copy (e.g. "1 week"). */
  tripLabel?: string;
  /** Extra photos from post HTML; omit when the post has none. */
  coverImages?: DestinationCoverImage[];
  /** Primary journal post for this place. */
  featuredPostSlug?: string;
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
        imageAlt: "Discovering Iceland — a week in the land of fire and ice",
        tripLabel: "1 week",
        featuredPostSlug:
          "discovering-iceland-a-week-in-the-land-of-fire-and-ice",
        highlights: [
          "Blue Lagoon soak after landing in Reykjavík",
          "South-coast waterfalls, Reynisfjara black beach, and Glacier Lagoon",
          "Glacier hike plus downtown Reykjavík",
          "Thingvellir, geysers, and volcano country on the last full day",
          "Base in peaceful Laugardalur; dinner at Kopar by the old harbor",
        ],
        coverImages: [
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/10/img_5935-1024x768.jpg?resize=640%2C480&ssl=1",
            alt: "Iceland landscape from the trip journal",
          },
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/10/img_5929-1024x768.jpg?resize=640%2C480&ssl=1",
            alt: "Iceland scenery photographed on the week-long trip",
          },
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/10/img_6605-1024x768.jpg?resize=640%2C480&ssl=1",
            alt: "Another view from the Iceland itinerary",
          },
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2024/10/img_6114-1024x768.jpg?resize=640%2C480&ssl=1",
            alt: "Trip photo from discovering Iceland",
          },
        ],
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
        tripLabel: "48 hours",
        featuredPostSlug: "toronto-travel-guide",
        highlights: [
          "Casa Loma — Gothic Revival castle, rooms, and gardens",
          "Toronto sign selfie at Nathan Phillips Square",
          "Hockey Hall of Fame stop on the city loop",
          "Dinner high above the skyline at the CN Tower",
          "Two-day mix of historic charm and modern icons",
        ],
        coverImages: [
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2022/04/IMG_1446-768x1024.webp?resize=640%2C853&ssl=1",
            alt: "Toronto trip photo from the 48-hour guide",
          },
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2022/04/IMG_1455-768x1024.webp?resize=640%2C853&ssl=1",
            alt: "Another frame from 48 hours in Toronto",
          },
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2022/04/IMG_1516-768x1024.webp?resize=640%2C853&ssl=1",
            alt: "Toronto landmark from the itinerary",
          },
          {
            src: "https://i0.wp.com/fernandesjourneys.com/wp-content/uploads/2022/04/IMG_1731-1024x768.webp?resize=640%2C480&ssl=1",
            alt: "Wide shot from the Toronto travel guide",
          },
        ],
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
        imageAlt: "Maroon Bells view and lake reflection",
        tripLabel: "Sunrise run",
        featuredPostSlug: "marron-bells",
        highlights: [
          "4:30 AM drive from Carbondale for Maroon Bells sunrise",
          "Lake reflection of the Bells before the crowds",
          "Foxes and moose on the early mountain road",
          "Advance vehicle reservation needed for pre-8 AM access",
        ],
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
        tripLabel: "5 days",
        featuredPostSlug: "cancun-5-day-travel-guide",
        highlights: [
          "Base at Emporio Cancun in the Hotel Zone",
          "Day trip to Chichen Itza and El Castillo",
          "Xplor Park ziplines, caverns, and jungle rivers",
          "Ferry to Isla Mujeres plus a Coco Bongo night",
        ],
        coverImages: [
          {
            src: "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/IMG_7860-768x1024.webp?resize=640%2C853&ssl=1",
            alt: "Cancún trip photo from the five-day guide",
          },
          {
            src: "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/IMG_9210-768x1024.webp?resize=640%2C853&ssl=1",
            alt: "Another frame from Cancún in 5 days",
          },
          {
            src: "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/IMG_8400-768x1024.webp?resize=640%2C853&ssl=1",
            alt: "Mexico trip photo from the Cancún itinerary",
          },
          {
            src: "https://i0.wp.com/alexjournly.com/wp-content/uploads/2026/06/IMG_9424-1024x768.webp?resize=640%2C480&ssl=1",
            alt: "Wide shot from the Cancún travel guide",
          },
        ],
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
        tripLabel: "2 weeks",
        featuredPostSlug: "rio-de-janeiro-itinerary",
        highlights: [
          "Sunset stroll along Copacabana Beach",
          "Christ the Redeemer and bohemian Santa Teresa",
          "Sugarloaf Mountain sunset from Urca",
          "Hikes and waterfalls in Tijuca National Park",
          "Day trips to Niterói and Ilha Grande",
        ],
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
