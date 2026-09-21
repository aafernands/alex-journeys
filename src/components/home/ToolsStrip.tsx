import Link from "next/link";
import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { NavIcon } from "@/components/icons/NavIcon";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { Section, SectionHead } from "@/components/ui/Section";
import { tripPlannerTools } from "@/data/nav";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign } from "@/lib/site-design";

export function ToolsStrip() {
  const preview = tripPlannerTools.slice(0, 4);
  const { tools } = getSiteDesign().homeSections;

  return (
    <Section
      id="tools-strip"
      tone="soft"
      hairline
      aria-labelledby="tools-strip-heading"
    >
      <SectionHead
        eyebrow={tools.eyebrow}
        title={tools.title}
        titleId="tools-strip-heading"
        description={tools.description}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AdminSectionEdit
              href={`${CMS_DESIGN_HREF}#design-tools`}
              label="Edit section"
            />
            <Link href="/tools" className="btn btn-ink">
              {tools.ctaLabel || "See all tools"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        }
      />

      <ul className="hub-follow grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {preview.map((tool) => (
          <li key={tool.href}>
            <OutboundLink
              href={tool.href}
              affiliate
              className="panel-interactive group flex h-full items-center gap-3 p-4"
            >
              <span className="icon-tile icon-tile-sm">
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
