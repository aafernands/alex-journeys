import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";

export const metadata: Metadata = {
  title: "Start Here",
  description:
    "New to Fernandes Journeys? Start with Places, Stories, Guides, and Tools from this personal travel journal.",
};

const steps = [
  {
    n: "01",
    title: "Places",
    href: "/destinations",
    icon: "map-pin",
    description:
      "Places I’ve already been — country pages with trip notes and linked stories.",
  },
  {
    n: "02",
    title: "Stories",
    href: "/blog",
    icon: "book-open",
    description:
      "Longer stories from the road: guides, sunrise runs, packing fails, and favorites.",
  },
  {
    n: "03",
    title: "Guides",
    href: "/guides",
    icon: "compass",
    description:
      "Six hubs — plan, money, packing, smarter travel, stays, and experiences.",
  },
  {
    n: "04",
    title: "Tools",
    href: "/tools",
    icon: "suitcase",
    description:
      "Honest affiliate tools I use for stays, flights, insurance, and connectivity — not a booking desk.",
  },
];

export default function StartHerePage() {
  return (
    <SitePage
      label="Welcome"
      title="Start here."
      description="This is a personal travel blog — places I’ve been and notes from the road. Pick a path below and dig in."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Start Here" },
      ]}
    >
      <ol className="mt-10 grid gap-4 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="panel-interactive group flex h-full gap-4 p-5 md:p-6"
            >
              <span className="flex flex-col items-center gap-3">
                <span className="font-display text-xs font-bold tracking-[0.14em] text-muted">
                  {step.n}
                </span>
                <span className="panel-nested flex size-11 items-center justify-center bg-white text-accent">
                  <NavIcon name={step.icon} size={20} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-xl font-bold text-heading">
                  {step.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-text">
                  {step.description}
                </span>
                <span className="mt-4 inline-block text-sm font-semibold text-link transition group-hover:text-accent">
                  Go →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="panel-soft mt-12 p-6 text-center">
        <p className="text-sm text-text">
          Want the short version of who I am?{" "}
          <Link href="/about" className="font-semibold text-link hover:text-accent">
            Read About →
          </Link>
        </p>
      </div>
    </SitePage>
  );
}
