import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PostContent } from "@/components/blog/PostContent";
import { SitePage } from "@/components/pages/SitePage";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { site } from "@/data/content";
import { asRecord, asString, asStringArray } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("media-kit", PAGE_DEFAULTS["media-kit"]);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/media-kit" },
  };
}

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

const pastPlaces = [
  { name: "Iceland", href: "/iceland" },
  { name: "Canada", href: "/canada" },
  { name: "United States", href: "/united-states" },
  { name: "Mexico", href: "/mexico" },
  { name: "Brazil", href: "/brazil" },
];

export default function MediaKitPage() {
  const page = getPageWithFallback("media-kit", PAGE_DEFAULTS["media-kit"]);
  const s = page.sections ?? {};
  const hero = asRecord(s.hero);
  const audience = asRecord(s.audience);
  const cta = asRecord(s.cta);
  const statsRaw = Array.isArray(audience.stats) ? audience.stats : [];
  const stats =
    statsRaw.length > 0
      ? statsRaw.map((item) => {
          const o = asRecord(item);
          return {
            value: asString(o.value, "—"),
            label: asString(o.label, ""),
          };
        })
      : [
          { value: "10K", label: "Instagram Followers" },
          { value: "15K", label: "Average Reach" },
          { value: "80K", label: "Website Visitors" },
        ];
  const createItems = asStringArray(
    s.createItems,
    PAGE_DEFAULTS["media-kit"].sections?.createItems as string[],
  );
  const partnershipTypes = asStringArray(
    s.partnershipTypes,
    PAGE_DEFAULTS["media-kit"].sections?.partnershipTypes as string[],
  );

  return (
    <SitePage
      cmsSlug="media-kit"
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Media Kit" },
      ]}
    >
      <section
        aria-labelledby="mk-hero"
        className="panel hub-follow grid gap-8 p-6 md:grid-cols-[minmax(0,12rem)_1fr] md:items-center md:gap-10 md:p-8"
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
            className="font-display mt-2 text-title text-heading"
          >
            {site.authorName}
          </h2>
          <p className="mt-2 text-base font-semibold text-accent">
            {asString(hero.role, "Traveler · Creator · Journal")}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-text md:text-base">
            {asString(
              hero.blurb,
              "Personal trip notes, destination stories, and honest recommendations from the road — partner-friendly, not an agency.",
            )}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={`mailto:${site.email}?subject=Partnership%20inquiry%20—%20Fernandes%20Journeys`}
              className="btn btn-primary btn-block sm:w-auto"
            >
              {asString(hero.primaryCta, "Email for partnerships")}
            </a>
            <a
              href="#audience"
              className="btn btn-secondary btn-block sm:w-auto"
            >
              {asString(hero.secondaryCta, "See audience & reach")}
            </a>
          </div>
        </div>
      </section>

      <section aria-labelledby="mk-about" className="hub-block">
        <p className="eyebrow">About</p>
        <h2
          id="mk-about"
          className="font-display mt-2 text-title text-heading"
        >
          {asString(s.aboutHeading, "One traveler, one journal")}
        </h2>
        <div className="panel mt-5 max-w-3xl p-6 md:p-8">
          <PostContent html={page.contentHtml} />
        </div>
      </section>

      <section
        id="audience"
        aria-labelledby="mk-audience"
        className="hub-block"
      >
        <p className="eyebrow">
          {asString(audience.eyebrow, "Audience & reach")}
        </p>
        <h2
          id="mk-audience"
          className="font-display mt-2 text-title text-heading"
        >
          {asString(audience.title, "Current numbers")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {asString(
            audience.note,
            "Snapshot from the current audience graphic — Instagram followers, average reach, and website visitors.",
          )}
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

      <section aria-labelledby="mk-platforms" className="hub-block">
        <p className="eyebrow">Platforms</p>
        <h2
          id="mk-platforms"
          className="font-display mt-2 text-title text-heading"
        >
          {asString(s.platformsHeading, "Where to find the journal")}
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3">
          {platforms.map((p) => (
            <li key={p.name}>
              <OutboundLink
                href={p.href}
                className="panel-interactive flex h-full flex-col gap-1 p-5 md:p-6"
              >
                <span className="card-title">{p.name}</span>
                <span className="text-sm text-muted">{p.handle}</span>
                <span className="card-cta mt-3">
                  Visit →
                </span>
              </OutboundLink>
            </li>
          ))}
        </ul>
      </section>

      <div className="hub-block grid gap-8 md:grid-cols-2 md:gap-6">
        <section aria-labelledby="mk-create" className="panel p-6 md:p-8">
          <p className="eyebrow">Content</p>
          <h2
            id="mk-create"
            className="font-display mt-2 text-title text-heading"
          >
            {asString(s.createHeading, "What I create")}
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
            className="font-display mt-2 text-title text-heading"
          >
            {asString(s.partnersHeading, "Partnership types")}
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

      <section aria-labelledby="mk-places" className="hub-block">
        <p className="eyebrow">Journal</p>
        <h2
          id="mk-places"
          className="font-display mt-2 text-title text-heading"
        >
          {asString(s.placesHeading, "Past places")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {asString(
            s.placesNote,
            "Destinations already documented on the site — from the personal trip journal.",
          )}
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

      <aside className="panel-soft hub-block p-6 md:p-8">
        <p className="eyebrow">{asString(cta.eyebrow, "Next step")}</p>
        <p className="font-display mt-2 text-title text-heading">
          {asString(cta.title, "Let’s talk")}
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-text md:text-base">
          {asString(
            cta.body,
            "For sponsorships, destination features, product or gear placements, affiliate work, or a newsletter mention — email me directly. I read every message.",
          )}
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
