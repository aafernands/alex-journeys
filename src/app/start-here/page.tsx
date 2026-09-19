import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";

export const metadata: Metadata = {
  title: "Start Here",
  description:
    "New to Alex Journly? Start with destinations, blog stories, resources, and trip tools from this personal travel journal.",
};

const steps = [
  {
    n: "01",
    title: "Destinations",
    href: "/destinations",
    icon: "map-pin",
    description:
      "Places I’ve already been — country pages with trip notes and linked stories.",
  },
  {
    n: "02",
    title: "Blog",
    href: "/blog",
    icon: "book-open",
    description:
      "Longer stories from the road: guides, sunrise runs, packing fails, and favorites.",
  },
  {
    n: "03",
    title: "Resources",
    href: "/resources",
    icon: "backpack",
    description:
      "Budget tips, gear, apps, and money notes that still earn a spot in my bag.",
  },
  {
    n: "04",
    title: "Trip tools",
    href: "/plan-your-trip",
    icon: "compass",
    description:
      "Honest affiliate tools I use for stays, flights, insurance, and connectivity — not a booking desk.",
  },
];

export default function StartHerePage() {
  return (
    <SitePage
      label="Welcome"
      title="Start here"
      description="This is a personal travel blog — places I’ve been and notes from the road. Pick a path below and dig in."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Start Here" },
      ]}
    >
      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:gap-6">
        {steps.map((step) => (
          <li key={step.href}>
            <Link
              href={step.href}
              className="group flex h-full gap-4 rounded-2xl border border-surface bg-white p-6 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_16px_40px_-24px_rgba(12,13,14,0.3)]"
            >
              <span className="flex flex-col items-center gap-3">
                <span className="font-display text-xs font-bold tracking-[0.16em] text-muted">
                  {step.n}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-surface-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                  <NavIcon name={step.icon} size={20} />
                </span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-display block text-xl font-bold text-heading transition group-hover:text-accent">
                  {step.title}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-text">
                  {step.description}
                </span>
                <span className="mt-4 inline-block text-sm font-bold text-link transition group-hover:text-accent">
                  Go →
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <p className="mt-12 text-center text-sm text-muted">
        Want the short version of who I am?{" "}
        <Link href="/about" className="font-semibold text-link hover:text-accent">
          Read About →
        </Link>
      </p>
    </SitePage>
  );
}
