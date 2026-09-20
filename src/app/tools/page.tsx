import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/pages/SitePage";
import { ToolCard } from "@/components/tools/ToolCard";
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
          opinions are Alex&apos;s own.{" "}
          <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
            Read the full disclosure
          </Link>
          .
        </p>
      </aside>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {tripPlannerTools.map((tool) => (
          <li key={tool.href}>
            <ToolCard tool={tool} />
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
        <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
          affiliate disclosure
        </Link>
      </p>
    </SitePage>
  );
}
