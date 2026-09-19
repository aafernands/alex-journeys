import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { tripPlannerTools } from "@/data/nav";

export const metadata: Metadata = {
  title: "Trip Planner",
  description:
    "Affiliate tools I actually use when planning trips — stays, flights, insurance, money, and connectivity.",
};

export default function PlanYourTripPage() {
  return (
    <SitePage
      label="Tools from the road"
      title="Trip Planner"
      description="A short list of partners I use when planning — not a booking desk. Some links are affiliates; if you book through them I may earn a small commission at no extra cost to you."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Trip Planner" },
      ]}
    >
      <ul className="mt-12 grid gap-4 sm:grid-cols-2">
        {tripPlannerTools.map((tool) => (
          <li key={tool.href}>
            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="group flex h-full gap-4 rounded-xl border border-surface bg-white p-5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_16px_40px_-24px_rgba(12,13,14,0.3)]"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                <NavIcon name={tool.icon} size={22} />
              </span>
              <span className="min-w-0">
                <span className="font-display block text-lg font-bold text-heading transition group-hover:text-accent">
                  {tool.title}
                </span>
                <span className="mt-0.5 block text-sm font-semibold text-muted">
                  {tool.partner}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-text">
                  {tool.description}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm text-muted">
        Related journal notes:{" "}
        <Link href="/blog/travel-insurance-allianz-world-nomads" className="text-link hover:text-accent">
          travel insurance
        </Link>
        {" · "}
        <Link href="/blog/wise-card-review" className="text-link hover:text-accent">
          Wise review
        </Link>
        {" · "}
        <Link href="/resources" className="text-link hover:text-accent">
          all resources
        </Link>
        {" · "}
        <Link href="/policies" className="text-link hover:text-accent">
          affiliate disclosure
        </Link>
      </p>
    </SitePage>
  );
}
