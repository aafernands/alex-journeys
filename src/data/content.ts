/**
 * Site copy for Fernandes Journeys.
 * Blog posts live in src/content/posts/ (migrated from alexjournly.com).
 * Homepage featured stories are selected in posts/_index.json.
 */

export const site = {
  name: "Fernandes Journeys",
  tagline: "Places I’ve been, written down so I don’t forget",
  email: "hello@fernandesjourneys.com",
  social: {
    instagram: "https://instagram.com/",
    youtube: "https://youtube.com/",
    pinterest: "https://pinterest.com/",
    newsletter: "#newsletter",
  },
};

export const stories = [
  {
    id: "kyoto-autumn",
    destination: "Kyoto, Japan",
    title: "Temple mornings & maple light",
    blurb:
      "A slow week between Arashiyama and the Philosopher’s Path — tea houses, quiet streets, and the hush before peak foliage.",
    date: "October 2025",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Traditional Japanese temple roof with autumn foliage",
  },
  {
    id: "amalfi-coast",
    destination: "Amalfi Coast, Italy",
    title: "Cliffside lunches & lemon groves",
    blurb:
      "Ferry hops from Positano to Capri, late dinners on terraces, and the kind of blue that recalibrates your idea of summer.",
    date: "June 2025",
    image:
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Colorful cliffside village on the Amalfi Coast",
  },
  {
    id: "marrakech",
    destination: "Marrakech, Morocco",
    title: "Souks, riads & desert light",
    blurb:
      "Medina mornings, rooftop mint tea, and a night under Sahara stars — texture, spice, and hospitality at every turn.",
    date: "March 2025",
    image:
      "https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Moroccan architecture with intricate tilework",
  },
  {
    id: "patagonia",
    destination: "Patagonia, Chile",
    title: "Wind, granite & glacier silence",
    blurb:
      "Torres del Paine on foot: early starts, wind-sculpted peaks, and the rare stillness when the weather finally softens.",
    date: "January 2025",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
    imageAlt: "Dramatic mountain peaks under a starry sky",
  },
];

export const favorites = [
  {
    category: "Stay",
    name: "Casa Lucía",
    place: "Oaxaca, Mexico",
    note: "A courtyard hotel with clay vessels, hammocks, and the best morning coffee within walking distance of the zócalo.",
  },
  {
    category: "Café",
    name: "Atelier Nord",
    place: "Copenhagen, Denmark",
    note: "Cardamom buns, natural light, and a corner table that somehow always feels like your own.",
  },
  {
    category: "Gear",
    name: "Softshell daypack",
    place: "Carry-on companion",
    note: "Packs flat, survives rain, and doesn’t scream “tourist” in crowded markets or trailheads.",
  },
  {
    category: "Ritual",
    name: "Golden-hour walk",
    place: "Wherever I land",
    note: "No agenda — just a neighborhood loop at dusk to learn the light, the sounds, and where to eat tomorrow.",
  },
];

export const about = {
  headline: "A journal of places I’ve been",
  paragraphs: [
    "I’m Alex — and Fernandes Journeys is my personal travel blog. I share destinations from trips I’ve already taken: the routes, the neighborhoods, and the small details I’d tell a friend over coffee.",
    "Expect trip notes, destination pages, and favorites from the road — not an agency, not a booking service, just a trip journal with room to breathe. Browse the blog for full stories from past trips.",
  ],
};

export const hero = {
  eyebrow: "Personal travel blog · Past trips · Notes from the road",
  title: "Fernandes Journeys",
  subtitle:
    "I share places I’ve been — destinations, trip notes, and photos from journeys already behind me. Pull up a chair; this is my journal, not a travel agency.",
  ctaPrimary: "Browse destinations",
  ctaSecondary: "Read the blog",
  image:
    "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1600&q=80",
  imageAlt: "Open travel journal and camera on a sunlit surface",
};
