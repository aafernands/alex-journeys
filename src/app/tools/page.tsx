import type { Metadata } from "next";
import Link from "next/link";
import { SitePage } from "@/components/pages/SitePage";
import { ToolCard } from "@/components/tools/ToolCard";
import { tripPlannerTools } from "@/data/nav";
import { asRecord, asString } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("tools", PAGE_DEFAULTS.tools);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/tools" },
  };
}

export default function ToolsPage() {
  const page = getPageWithFallback("tools", PAGE_DEFAULTS.tools);
  const disclosure = asRecord(page.sections?.disclosure);

  return (
    <SitePage
      cmsSlug="tools"
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Tools I use" },
      ]}
    >
      <aside
        className="panel-nested hub-follow bg-surface-soft px-5 py-4"
        aria-label="Affiliate disclosure"
      >
        <p className="font-display text-sm font-bold text-heading">
          {asString(disclosure.title, "Affiliate & partner links")}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-text">
          {asString(
            disclosure.body,
            "These are affiliate or partner links. If you book or buy through one, Alex Journeys may earn a commission at no extra cost to you. The opinions are Alex’s own.",
          )}{" "}
          <Link href="/affiliate-disclosure" className="text-link hover:text-accent">
            Read the full disclosure
          </Link>
          .
        </p>
      </aside>

      <ul className="hub-follow grid gap-4 sm:grid-cols-2">
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
