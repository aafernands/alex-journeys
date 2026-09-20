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

export type ClimateIcon =
  | "sun"
  | "cloud"
  | "partly-cloudy"
  | "rain"
  | "snow"
  | "storm";

export type ClimateQuality = "best" | "good" | "mixed" | "poor";

export type ClimateMonth = {
  /** Calendar month 1–12. */
  month: number;
  label: string;
  icon: ClimateIcon;
  /** Typical average temperature in °C. */
  avgC: number;
  quality: ClimateQuality;
};

export type DestinationClimate = {
  summary: string;
  bestTime: string;
  months: ClimateMonth[];
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
  /** Static monthly climate norms (not a live forecast). */
  climate?: DestinationClimate;
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
        climate: {
          summary:
            "Cool maritime weather year-round — mild summers, long winter nights, and changeable skies. Pack layers even in July.",
          bestTime: "June–August for the mildest days and nearly endless light.",
          months: [
            { month: 1, label: "Cold & dark", icon: "snow", avgC: -1, quality: "poor" },
            { month: 2, label: "Winter chill", icon: "snow", avgC: 0, quality: "poor" },
            { month: 3, label: "Windy thaw", icon: "cloud", avgC: 1, quality: "mixed" },
            { month: 4, label: "Spring showers", icon: "rain", avgC: 4, quality: "mixed" },
            { month: 5, label: "Bright & cool", icon: "partly-cloudy", avgC: 8, quality: "good" },
            { month: 6, label: "Midnight sun", icon: "sun", avgC: 11, quality: "best" },
            { month: 7, label: "Mild peak", icon: "sun", avgC: 13, quality: "best" },
            { month: 8, label: "Soft summer", icon: "partly-cloudy", avgC: 12, quality: "best" },
            { month: 9, label: "Early autumn", icon: "rain", avgC: 9, quality: "good" },
            { month: 10, label: "Stormy fall", icon: "rain", avgC: 5, quality: "mixed" },
            { month: 11, label: "Dark & wet", icon: "cloud", avgC: 2, quality: "poor" },
            { month: 12, label: "Deep winter", icon: "snow", avgC: 0, quality: "poor" },
          ],
        },
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
        climate: {
          summary:
            "Four clear seasons in Toronto — snowy winters, lush springs, warm humid summers, and crisp colorful falls.",
          bestTime: "May–September for patio weather and outdoor city wandering.",
          months: [
            { month: 1, label: "Deep freeze", icon: "snow", avgC: -4, quality: "poor" },
            { month: 2, label: "Snowy cold", icon: "snow", avgC: -3, quality: "poor" },
            { month: 3, label: "Muddy thaw", icon: "cloud", avgC: 2, quality: "mixed" },
            { month: 4, label: "Spring rain", icon: "rain", avgC: 9, quality: "good" },
            { month: 5, label: "Mild & green", icon: "partly-cloudy", avgC: 15, quality: "best" },
            { month: 6, label: "Warm days", icon: "sun", avgC: 20, quality: "best" },
            { month: 7, label: "Hot & humid", icon: "sun", avgC: 23, quality: "best" },
            { month: 8, label: "Peak summer", icon: "sun", avgC: 22, quality: "best" },
            { month: 9, label: "Golden fall", icon: "partly-cloudy", avgC: 18, quality: "good" },
            { month: 10, label: "Crisp autumn", icon: "cloud", avgC: 11, quality: "good" },
            { month: 11, label: "Gray & damp", icon: "rain", avgC: 5, quality: "mixed" },
            { month: 12, label: "Early winter", icon: "snow", avgC: -1, quality: "poor" },
          ],
        },
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
        climate: {
          summary:
            "High Rockies around Maroon Bells — cold snowy winters, short mild summers, and spectacular early-fall color. Elevation means big day–night swings.",
          bestTime: "June–September for trail access, lake reflections, and mountain mornings.",
          months: [
            { month: 1, label: "Deep snow", icon: "snow", avgC: -8, quality: "poor" },
            { month: 2, label: "Ski winter", icon: "snow", avgC: -6, quality: "poor" },
            { month: 3, label: "Late powder", icon: "snow", avgC: -2, quality: "mixed" },
            { month: 4, label: "Spring melt", icon: "cloud", avgC: 3, quality: "mixed" },
            { month: 5, label: "Trail thaw", icon: "partly-cloudy", avgC: 8, quality: "good" },
            { month: 6, label: "Alpine green", icon: "sun", avgC: 14, quality: "best" },
            { month: 7, label: "Warm peaks", icon: "sun", avgC: 17, quality: "best" },
            { month: 8, label: "Clear skies", icon: "sun", avgC: 16, quality: "best" },
            { month: 9, label: "Fall color", icon: "partly-cloudy", avgC: 12, quality: "best" },
            { month: 10, label: "Crisp close", icon: "cloud", avgC: 6, quality: "good" },
            { month: 11, label: "First snow", icon: "snow", avgC: -1, quality: "mixed" },
            { month: 12, label: "Hard freeze", icon: "snow", avgC: -6, quality: "poor" },
          ],
        },
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
        climate: {
          summary:
            "Tropical Cancún — warm year-round with a drier winter season and a wetter, stormier summer through early fall.",
          bestTime: "December–April for sun, lower humidity, and calmer seas.",
          months: [
            { month: 1, label: "Dry & sunny", icon: "sun", avgC: 24, quality: "best" },
            { month: 2, label: "Peak sun", icon: "sun", avgC: 25, quality: "best" },
            { month: 3, label: "Warm beach", icon: "sun", avgC: 26, quality: "best" },
            { month: 4, label: "Hot & clear", icon: "sun", avgC: 27, quality: "best" },
            { month: 5, label: "Humid build", icon: "partly-cloudy", avgC: 28, quality: "good" },
            { month: 6, label: "Rainy start", icon: "rain", avgC: 28, quality: "mixed" },
            { month: 7, label: "Wet heat", icon: "rain", avgC: 29, quality: "mixed" },
            { month: 8, label: "Stormy", icon: "storm", avgC: 29, quality: "mixed" },
            { month: 9, label: "Hurricane risk", icon: "storm", avgC: 28, quality: "poor" },
            { month: 10, label: "Late rains", icon: "rain", avgC: 27, quality: "mixed" },
            { month: 11, label: "Clearing up", icon: "partly-cloudy", avgC: 26, quality: "good" },
            { month: 12, label: "Dry return", icon: "sun", avgC: 25, quality: "best" },
          ],
        },
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
        climate: {
          summary:
            "Rio’s subtropical coast — hot rainy summers, milder drier winters, and beach weather most of the year with humidity spikes in peak summer.",
          bestTime: "May–September for cooler, drier days and clearer viewpoints.",
          months: [
            { month: 1, label: "Hot & wet", icon: "storm", avgC: 27, quality: "mixed" },
            { month: 2, label: "Summer rain", icon: "rain", avgC: 27, quality: "mixed" },
            { month: 3, label: "Warm taper", icon: "rain", avgC: 26, quality: "good" },
            { month: 4, label: "Mild autumn", icon: "partly-cloudy", avgC: 24, quality: "good" },
            { month: 5, label: "Dry & pleasant", icon: "sun", avgC: 22, quality: "best" },
            { month: 6, label: "Cool clear", icon: "sun", avgC: 21, quality: "best" },
            { month: 7, label: "Peak dry", icon: "sun", avgC: 20, quality: "best" },
            { month: 8, label: "Crisp winter", icon: "sun", avgC: 21, quality: "best" },
            { month: 9, label: "Spring mild", icon: "partly-cloudy", avgC: 22, quality: "good" },
            { month: 10, label: "Warmer days", icon: "partly-cloudy", avgC: 23, quality: "good" },
            { month: 11, label: "Humid build", icon: "rain", avgC: 24, quality: "mixed" },
            { month: 12, label: "Summer start", icon: "storm", avgC: 26, quality: "mixed" },
          ],
        },
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
