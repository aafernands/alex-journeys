import Link from "next/link";
import { NavIcon } from "@/components/icons/NavIcon";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { Section, SectionHead } from "@/components/ui/Section";
import { tripPlannerTools } from "@/data/nav";

export function ToolsStrip() {
  const preview = tripPlannerTools.slice(0, 4);

  return (
    <Section
      id="tools-strip"
      tone="soft"
      hairline
      aria-labelledby="tools-strip-heading"
    >
      <SectionHead
        eyebrow="Tools"
        title="Tools I use."
        titleId="tools-strip-heading"
        description="Partners I actually open when planning — stays, flights, insurance, and connectivity."
        action={
          <Link href="/tools" className="btn btn-ink">
            See all tools
            <span aria-hidden="true">→</span>
          </Link>
        }
      />

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {preview.map((tool) => (
          <li key={tool.href}>
            <OutboundLink
              href={tool.href}
              affiliate
              className="panel-interactive group flex h-full items-center gap-3 p-4"
            >
              <span className="panel-nested flex size-9 shrink-0 items-center justify-center bg-white text-accent">
                <NavIcon name={tool.icon} size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-heading">
                  {tool.title}
                </span>
                <span className="block text-xs text-muted">{tool.partner}</span>
              </span>
            </OutboundLink>
          </li>
        ))}
      </ul>
    </Section>
  );
}
