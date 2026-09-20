import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { tripPlannerTools } from "@/data/nav";

export const metadata: Metadata = {
  title: "Tools I use",
  description:
    "Affiliate tools I actually use when planning trips — stays, flights, insurance, money, and connectivity.",
};

export default function ToolsPage() {
  return (
    <SitePage
      label="Tools from the road"
      title="Tools I use"
      description="A short list of partners I use when planning — not a booking desk. Some links are affiliates; if you book through them I may earn a small commission at no extra cost to you."
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Tools I use" },
      ]}
    >
      <aside
        className="panel-nested mt-8 bg-surface-soft px-5 py-4"
        aria-label="Affiliate disclosure"
      >
        <p className="font-display text-sm font-bold text-heading">
          Affiliate &amp; partner links
        </p>
        <p className="mt-1 text-sm leading-relaxed text-text">
          These are affiliate or partner links. If you book or buy through one,
          Fernandes Journeys may earn a commission at no extra cost to you. The
          opinions are Alex&apos;s own.{' '}
          <Link href="/policies#monetization" className="text-link hover:text-accent">
            Read the full disclosure
          </Link>
          .
        </p>
      </aside>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {tripPlannerTools.map((tool) => (
          <li key={tool.href}>
            <a
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="panel-interactive group flex h-full gap-4 p-5"
            >
              <span className="panel-nested flex size-12 shrink-0 items-center justify-center bg-white text-accent">
                <NavIcon name={tool.icon} size={22} />
              </span>
              <span className="min-w-0">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-display text-lg font-bold text-heading">
                    {tool.title}
                  </span>
                  <ExternalLink
                    className="mt-1 size-4 shrink-0 text-accent"
                    strokeWidth={2}
                    aria-label="Opens in a new tab"
                  />
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
        <Link
          href="/travel-insurance-allianz-world-nomads"
          className="text-link hover:text-accent"
        >
          travel insurance
        </Link>
        {" · "}
        <Link href="/wise-card-review" className="text-link hover:text-accent">
          Wise review
        </Link>
        {" · "}
        <Link href="/guides" className="text-link hover:text-accent">
          all guides
        </Link>
        {" · "}
        <Link href="/policies" className="text-link hover:text-accent">
          affiliate disclosure
        </Link>
      </p>
    </SitePage>
  );
}
