/**
 * Fallback CMS page content seeded from the previous React copy.
 * Used when JSON is missing so builds never render blank chrome.
 */
import type { SitePage } from "@/lib/pages";

export const PAGE_DEFAULTS: Record<string, SitePage> = {
  about: {
    slug: "about",
    title: "Hi, I’m Alex",
    label: "About",
    description:
      "I’m Alex Fernandes — traveler, photographer, and the voice behind Fernandes Journeys. Based in New Jersey, I share destinations from trips I’ve already taken: the routes, the neighborhoods, and the small details I’d tell a friend over coffee.",
    contentHtml:
      "<p>Expect trip notes, destination pages, and favorites from the road — not an agency, not a booking service. Just a personal trip journal with room to breathe.</p>\n<p>Fernandes Journeys is my personal trip journal — one traveler, one set of stories.</p>",
    sections: {
      nextStep: {
        eyebrow: "Next step",
        title: "New to the journal?",
        body: "Start with destinations I’ve visited, then stories from the road, then the resources and trip tools I actually use.",
        primaryCta: { label: "Start here", href: "/start-here" },
        secondaryCta: { label: "Media kit", href: "/media-kit" },
        tertiaryCta: { label: "Contact", href: "/contact" },
      },
    },
  },
  contact: {
    slug: "contact",
    title: "Contact me",
    label: "Hello",
    description:
      "I’d love to hear from you. Say hello about a trip you’ve taken, a story idea, or just to share a photo from the road — this is a personal journal, not a booking desk.",
    contentHtml: "<p></p>",
    sections: {
      form: {
        firstNameLabel: "First name",
        lastNameLabel: "Last name",
        emailLabel: "Email",
        messageLabel: "Message",
        submitLabel: "Send message",
        successCopy: "Opening your email app to send…",
        directEmailHint: "Or email me directly at",
      },
      emailAside: {
        title: "Prefer email?",
        body: "Reach me at {email}. I read every message — replies may take a few days if I’m mid-itinerary.",
      },
    },
  },
  "start-here": {
    slug: "start-here",
    title: "Start here.",
    label: "Welcome",
    description:
      "A personal travel journal of places I’ve been and notes from the road. When you want to go, sketch the itinerary and book flights and stays in the same place.",
    contentHtml: "<p></p>",
    sections: {
      steps: [
        {
          title: "Plan a trip",
          href: "/guides/plan-a-trip",
          icon: "plane",
          description:
            "Sketch the days, then book flights and stays from the same itinerary. One place for the plan — not a deals site.",
          cta: "Start planning",
        },
        {
          title: "Places",
          href: "/destinations",
          icon: "map-pin",
          description:
            "Places I’ve already been — country pages with trip notes and linked stories.",
          cta: "Browse places",
        },
        {
          title: "Stories",
          href: "/blog",
          icon: "book-open",
          description:
            "Longer stories from the road: guides, sunrise runs, packing fails, and favorites.",
          cta: "Read stories",
        },
        {
          title: "Guides",
          href: "/guides",
          icon: "compass",
          description:
            "Six hubs — plan, money, packing, smarter travel, stays, and experiences.",
          cta: "Open guides",
        },
        {
          title: "Gear & apps",
          href: "/tools",
          icon: "backpack",
          description:
            "Affiliate recommendations I actually use — gear, apps, and staying connected. To book flights or a stay, use Plan a trip or Stays.",
          cta: "See the list",
        },
      ],
      aboutTeaser:
        "Want the short version of who I am? Read About →",
    },
  },
  "media-kit": {
    slug: "media-kit",
    title: "Media kit",
    label: "For brands",
    description:
      "A simple overview of Fernandes Journeys — who I am, where the audience is, and how we can work together.",
    contentHtml:
      "<p>I’m Alex Fernandes — traveler and photographer behind Fernandes Journeys. Based in New Jersey, I document trips I’ve already taken: the routes, neighborhoods, and small details I’d tell a friend over coffee.</p>\n<p>The journal covers places across Iceland, Canada, the US, Mexico, and Brazil, with longer stories, practical guides, and photo-led moments that travel well on Instagram and YouTube.</p>\n<p>Brands work with me directly — no agency middle layer. If a destination, product, or tool fits how I actually travel, I’m open to featuring it honestly.</p>",
    sections: {
      hero: {
        role: "Traveler · Creator · Journal",
        blurb:
          "Personal trip notes, destination stories, and honest recommendations from the road — partner-friendly, not an agency.",
        primaryCta: "Email for partnerships",
        secondaryCta: "See audience & reach",
      },
      aboutHeading: "One traveler, one journal",
      audience: {
        eyebrow: "Audience & reach",
        title: "Current numbers",
        note:
          "Snapshot from the current audience graphic — Instagram followers, average reach, and website visitors.",
        stats: [
          { value: "10K", label: "Instagram Followers" },
          { value: "15K", label: "Average Reach" },
          { value: "80K", label: "Website Visitors" },
        ],
      },
      platformsHeading: "Where to find the journal",
      mailingAddress: "PO BOX 2101 · Ocean, NJ 07712 · USA",
      createHeading: "What I create",
      createItems: [
        "Destination stories from trips I’ve already taken",
        "Reels- and Shorts-friendly moments from the road",
        "Practical guides and itinerary notes",
        "Honest tool and affiliate recommendations I actually use",
      ],
      partnersHeading: "Partnership types",
      partnershipTypes: [
        "Sponsored posts",
        "Destination features",
        "Product / gear features",
        "Affiliate partnerships",
        "Newsletter mentions",
      ],
      placesHeading: "Past places",
      placesNote:
        "Destinations already documented on the site — from the personal trip journal.",
      cta: {
        eyebrow: "Next step",
        title: "Let’s talk",
        body: "For sponsorships, destination features, product or gear placements, affiliate work, or a newsletter mention — email me directly. I read every message.",
      },
    },
  },
  app: {
    slug: "app",
    title: "About Fernandes Journeys & Google Sign-In",
    label: "Google OAuth app",
    description:
      "Public information about the Fernandes Journeys website and why it uses Google Sign-In.",
    contentHtml:
      "<p><strong>What it is:</strong> A personal travel journal — destinations from past trips, trip notes, and photos from the road. Public stories are readable without signing in.</p>\n<p><strong>Why Google Sign-In:</strong> Google Sign-In is <strong>not</strong> a consumer social login product on this site. It is used only so (1) readers may optionally save posts to an account, and (2) authorized admins can sign in to the private content management system at <code>/cms</code> to publish and edit travel stories. Most visitors never need to sign in.</p>",
    sections: {
      visitorAside: {
        eyebrow: "For visitors",
        title: "No login required to read the journal",
        body: "Explore places, stories, and guides freely. Sign in with Google only if you want to save posts — or if you are an authorized admin editing the CMS.",
      },
    },
  },
  guides: {
    slug: "guides",
    title: "Guides worth opening.",
    label: "Guides",
    description:
      "Practical notes from trips already taken — planning, money, packing, smarter travel, stays, and experiences. No booking desk; just the journal.",
    contentHtml: "<p></p>",
  },
  tools: {
    slug: "tools",
    title: "Tools I use",
    label: "Tools from the road",
    description:
      "A short list of partners I use when planning — not a booking desk. Some links are affiliates; if you book through them I may earn a small commission at no extra cost to you.",
    contentHtml: "<p></p>",
    sections: {
      disclosure: {
        title: "Affiliate & partner links",
        body: "These are affiliate or partner links. If you book or buy through one, Fernandes Journeys may earn a commission at no extra cost to you. The opinions are Alex’s own.",
      },
    },
  },
  destinations: {
    slug: "destinations",
    title: "Places I’ve been.",
    label: "Places",
    description:
      "A photo map of past trips — Iceland nights, Canadian weekends, mountain mornings, Caribbean water, and Rio after dark. Stories and notes, not a booking catalog.",
    contentHtml: "<p></p>",
  },
  blog: {
    slug: "blog",
    title: "Stories",
    label: "Journal",
    description:
      "Trip notes, destination guides, and travel tips from Fernandes Journeys.",
    contentHtml: "<p></p>",
    sections: {
      introTemplate:
        "{count} stories from the road — destination guides, trip notes, and practical travel tips. Filter by place or guide topic.",
    },
  },
};

export function defaultPage(slug: string): SitePage | null {
  return PAGE_DEFAULTS[slug] ?? null;
}
