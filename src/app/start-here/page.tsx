import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";

export const metadata: Metadata = {
  title: "Start Here",
  description:
    "New to Fernandes Journeys? Start with Places, Stories, Guides, and Tools from this personal travel journal.",
  alternates: { canonical: "/start-here" },
};

const steps = [
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
    title: "Tools",
    href: "/tools",
    icon: "suitcase",
    description:
      "Honest affiliate tools I use for stays, flights, insurance, and connectivity — not a booking desk.",
    cta: "See tools",
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
      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="panel-interactive group flex h-full flex-col p-6 md:p-7"
            >
              <span className="flex items-center gap-3">
                <NavIcon
                  name={step.icon}
                  size={22}
                  className="shrink-0 text-accent"
                />
                <span className="font-display text-xl font-bold tracking-tight text-heading">
                  {step.title}
                </span>
              </span>
              <span className="mt-3 flex-1 text-sm leading-relaxed text-text md:text-[0.9375rem]">
                {step.description}
              </span>
              <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-link transition group-hover:gap-2.5 group-hover:text-accent">
                {step.cta}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="panel-soft mt-12 p-6 text-center">
        <p className="text-sm text-text">
          Want the short version of who I am?{" "}
          <Link
            href="/about"
            className="font-semibold text-link hover:text-accent"
          >
            Read About →
          </Link>
        </p>
      </div>
    </SitePage>
  );
}
