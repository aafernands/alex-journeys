import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SitePage } from "@/components/pages/SitePage";
import { site } from "@/data/content";

export const metadata: Metadata = {
  title: "Media Kit",
  description:
    "Media kit for Fernandes Journeys — audience reach, platforms, partnership types, and how to work with Alex Fernandes.",
};

const stats = [
  { value: "10K", label: "Instagram Followers" },
  { value: "15K", label: "Average Reach" },
  { value: "80K", label: "Website Visitors" },
];

const platforms = [
  {
    name: "Instagram",
    handle: "@fernandesjourneys",
    href: site.social.instagram,
  },
  {
    name: "YouTube",
    handle: "@fernandesjourneys",
    href: site.social.youtube,
  },
  {
    name: "Blog",
    handle: "Fernandes Journeys",
    href: "/",
  },
];

const createItems = [
  "Destination stories from trips I’ve already taken",
  "Reels- and Shorts-friendly moments from the road",
  "Practical guides and itinerary notes",
  "Honest tool and affiliate recommendations I actually use",
];

const partnershipTypes = [
  "Sponsored posts",
  "Destination features",
  "Product / gear features",
  "Affiliate partnerships",
  "Newsletter mentions",
];

const pastPlaces = [
  { name: "Iceland", href: "/iceland" },
  { name: "Canada", href: "/canada" },
  { name: "United States", href: "/united-states" },
  { name: "Mexico", href: "/mexico" },
  { name: "Brazil", href: "/brazil" },
];

export default function MediaKitPage() {
  return (
    <SitePage
      label="For brands"
      title="Media kit"
      description="A simple overview of Fernandes Journeys — who I am, where the audience is, and how we can work together."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Media Kit" },
      ]}
    >
      {/* Hero */}
      <section
        aria-labelledby="mk-hero"
        className="panel mt-10 grid gap-8 p-6 md:mt-12 md:grid-cols-[minmax(0,12rem)_1fr] md:items-center md:gap-10 md:p-8"
      >
        <div className="relative mx-auto aspect-[3/4] w-full max-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface-soft md:mx-0">
          <Image
            src={site.authorPhoto}
            alt={site.authorName}
            fill
            sizes="192px"
            className="object-cover object-top"
            priority
          />
        </div>
        <div>
          <p className="eyebrow">Fernandes Journeys</p>
          <h2
            id="mk-hero"
            className="font-display mt-2 text-2xl font-bold tracking-tight text-heading md:text-3xl"
          >
            {site.authorName}
          </h2>
          <p className="mt-2 text-base font-semibold text-accent">
            Traveler · Creator · Journal
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-text md:text-base">
            Personal trip notes, destination stories, and honest recommendations
            from the road — partner-friendly, not an agency.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`mailto:${site.email}?subject=Partnership%20inquiry%20—%20Fernandes%20Journeys`}
              className="btn btn-primary btn-block sm:w-auto"
            >
              Email for partnerships
            </a>
            <a
              href="#audience"
              className="btn btn-secondary btn-block sm:w-auto"
            >
              See audience &amp; reach
            </a>
          </div>
        </div>
      </section>

      {/* About */}
      <section aria-labelledby="mk-about" className="mt-12 md:mt-14">
        <p className="eyebrow">About</p>
        <h2
          id="mk-about"
          className="font-display mt-2 text-xl font-bold text-heading md:text-2xl"
        >
          One traveler, one journal
        </h2>
        <div className="panel mt-5 max-w-3xl space-y-4 p-6 text-base leading-relaxed text-text md:p-8">
          <p>
            I’m Alex Fernandes — traveler and photographer behind Fernandes
            Journeys. Based in New Jersey, I document trips I’ve already taken:
            the routes, neighborhoods, and small details I’d tell a friend over
            coffee.
          </p>
          <p>
            The journal covers places across Iceland, Canada, the US, Mexico,
            and Brazil, with longer stories, practical guides, and photo-led
            moments that travel well on Instagram and YouTube.
          </p>
          <p>
            Brands work with me directly — no agency middle layer. If a
            destination, product, or tool fits how I actually travel, I’m open
            to featuring it honestly.
          </p>
        </div>
      </section>

      {/* Audience & reach */}
      <section
        id="audience"
        aria-labelledby="mk-audience"
        className="mt-12 md:mt-14"
      >
        <p className="eyebrow">Audience &amp; reach</p>
        <h2
          id="mk-audience"
          className="font-display mt-2 text-xl font-bold text-heading md:text-2xl"
        >
          Current numbers
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Snapshot from the current audience graphic — Instagram followers,
          average reach, and website visitors.
        </p>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {stats.map((stat) => (
            <li key={stat.label} className="panel p-6 text-center md:p-8">
              <p className="font-display text-4xl font-bold tracking-tight text-heading md:text-5xl">
                {stat.value}
              </p>
              <p className="mt-2 text-sm font-semibold text-muted">{stat.label}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Platforms */}
      <section aria-labelledby="mk-platforms" className="mt-12 md:mt-14">
        <p className="eyebrow">Platforms</p>
        <h2
          id="mk-platforms"
          className="font-display mt-2 text-xl font-bold text-heading md:text-2xl"
        >
          Where to find the journal
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {platforms.map((p) => (
            <li key={p.name}>
              <a
                href={p.href}
                {...(p.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="panel-interactive flex h-full flex-col gap-1 p-5 md:p-6"
              >
                <span className="font-display text-lg font-bold text-heading">
                  {p.name}
                </span>
                <span className="text-sm text-muted">{p.handle}</span>
                <span className="mt-3 text-sm font-semibold text-link">
                  Visit →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* What I create + Partnership types */}
      <div className="mt-12 grid gap-8 md:mt-14 md:grid-cols-2 md:gap-6">
        <section aria-labelledby="mk-create" className="panel p-6 md:p-8">
          <p className="eyebrow">Content</p>
          <h2
            id="mk-create"
            className="font-display mt-2 text-xl font-bold text-heading"
          >
            What I create
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-text md:text-base">
            {createItems.map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="mk-partners" className="panel p-6 md:p-8">
          <p className="eyebrow">Collaborate</p>
          <h2
            id="mk-partners"
            className="font-display mt-2 text-xl font-bold text-heading"
          >
            Partnership types
          </h2>
          <ul className="mt-5 space-y-3 text-sm leading-relaxed text-text md:text-base">
            {partnershipTypes.map((item) => (
              <li key={item} className="flex gap-3">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Past places */}
      <section aria-labelledby="mk-places" className="mt-12 md:mt-14">
        <p className="eyebrow">Journal</p>
        <h2
          id="mk-places"
          className="font-display mt-2 text-xl font-bold text-heading md:text-2xl"
        >
          Past places
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          Destinations already documented on the site — from the personal trip
          journal.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {pastPlaces.map((place) => (
            <li key={place.href}>
              <Link
                href={place.href}
                className="inline-flex rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-heading transition hover:border-border-strong hover:bg-surface-soft"
              >
                {place.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Contact CTA */}
      <aside className="panel-soft mt-12 p-6 md:mt-14 md:p-8">
        <p className="eyebrow">Next step</p>
        <p className="font-display mt-2 text-xl font-bold text-heading md:text-2xl">
          Let’s talk
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text md:text-base">
          For sponsorships, destination features, product or gear placements,
          affiliate work, or a newsletter mention — email me directly. I read
          every message.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={`mailto:${site.email}?subject=Partnership%20inquiry%20—%20Fernandes%20Journeys`}
            className="btn btn-primary btn-block sm:w-auto"
          >
            {site.email}
          </a>
          <Link href="/contact" className="btn btn-secondary btn-block sm:w-auto">
            Contact form
          </Link>
        </div>
        <p className="mt-5 text-xs text-muted">
          Tip: this page prints cleanly from your browser if you need a PDF
          (File → Print → Save as PDF).
        </p>
      </aside>
    </SitePage>
  );
}
