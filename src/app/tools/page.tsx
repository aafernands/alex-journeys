import type { Metadata } from "next";
import Link from "next/link";
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
                <span className="font-display block text-lg font-bold text-heading">
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
        <Link
          href="/blog/travel-insurance-allianz-world-nomads"
          className="text-link hover:text-accent"
        >
          travel insurance
        </Link>
        {" · "}
        <Link href="/blog/wise-card-review" className="text-link hover:text-accent">
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
