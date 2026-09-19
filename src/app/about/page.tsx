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
      <div className="panel mt-10 space-y-5 p-6 text-base leading-relaxed text-text md:mt-12 md:p-8">
        {about.paragraphs.slice(1).map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
      </div>

      <aside className="panel-soft mt-8 p-6 md:p-8">
        <p className="eyebrow">Next step</p>
        <p className="font-display mt-2 text-lg font-bold text-heading">
          New to the journal?
        </p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          Start with destinations I&apos;ve visited, then stories from the road,
          then the resources and trip tools I actually use.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link href="/start-here" className="btn btn-primary btn-block sm:w-auto">
            Start here
          </Link>
          <Link href="/contact" className="btn btn-secondary btn-block sm:w-auto">
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
