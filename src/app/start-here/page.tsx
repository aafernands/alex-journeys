import type { Metadata } from "next";
import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { SitePage } from "@/components/pages/SitePage";
import { asRecord, asString } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("start-here", PAGE_DEFAULTS["start-here"]);
  return {
    title: page.title.replace(/\.$/, ""),
    description: page.description,
    alternates: { canonical: "/start-here" },
  };
}

type Step = {
  title: string;
  href: string;
  icon: string;
  description: string;
  cta: string;
};

function readSteps(raw: unknown): Step[] {
  const fallback = (PAGE_DEFAULTS["start-here"].sections?.steps ?? []) as Step[];
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const steps: Step[] = [];
  for (const item of raw) {
    const o = asRecord(item);
    const title = asString(o.title);
    const href = asString(o.href);
    if (!title || !href) continue;
    steps.push({
      title,
      href,
      icon: asString(o.icon, "compass"),
      description: asString(o.description),
      cta: asString(o.cta, "Open"),
    });
  }
  return steps.length ? steps : fallback;
}

export default function StartHerePage() {
  const page = getPageWithFallback("start-here", PAGE_DEFAULTS["start-here"]);
  const steps = readSteps(page.sections?.steps);
  const teaser = asString(
    page.sections?.aboutTeaser,
    "Want the short version of who I am?",
  );

  return (
    <SitePage
      cmsSlug="start-here"
      label={page.label}
      title={page.title}
      description={page.description}
      narrow={false}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Start Here" },
      ]}
    >
      <ul className="hub-follow grid gap-4 sm:grid-cols-2">
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
                <span className="card-title">{step.title}</span>
              </span>
              <span className="card-body mt-3 flex-1">
                {step.description}
              </span>
              <span className="card-cta mt-5 inline-flex items-center gap-1.5 transition group-hover:gap-2.5 group-hover:text-accent">
                {step.cta}
                <span aria-hidden="true">→</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="panel-soft hub-block p-6 text-center">
        <p className="text-sm text-text">
          {teaser}{" "}
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
