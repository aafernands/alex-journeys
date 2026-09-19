import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/pages/SitePage";
import { about, site } from "@/data/content";

export const metadata: Metadata = {
  title: "About",
  description:
    "Meet Alex — the traveler behind Alex Journly / Fernandes Journeys, a personal trip journal of places already visited.",
};

export default function AboutPage() {
  return (
    <SitePage
      label="About"
      title={about.headline}
      description={about.paragraphs[0]}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "About" },
      ]}
    >
      <div className="mt-10 space-y-5 text-base leading-relaxed text-text md:mt-12">
        {about.paragraphs.slice(1).map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <aside className="mt-12 rounded-2xl border border-surface bg-surface-soft p-6">
        <p className="font-display text-lg font-bold text-heading">
          New to the journal?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          Start with destinations I&apos;ve visited, then stories from the road,
          then the resources and trip tools I actually use.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/start-here"
            className="inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-accent-deep"
          >
            Start here
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-md border border-heading/15 bg-white px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-heading transition hover:border-accent hover:text-accent"
          >
            Contact
          </Link>
        </div>
      </aside>

      <p className="mt-10 text-sm text-muted">
        Prefer email?{" "}
        <a href={`mailto:${site.email}`} className="text-link hover:text-accent">
          {site.email}
        </a>
      </p>
    </SitePage>
  );
}
