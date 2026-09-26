import Link from "next/link";
import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { NavIcon } from "@/components/icons/NavIcon";
import { Section, SectionHead } from "@/components/ui/Section";
import { guideHubs } from "@/data/guides";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign } from "@/lib/site-design";

export function GuidesHubStrip() {
  const { guides } = getSiteDesign().homeSections;

  return (
    <Section
      id="guides-hubs"
      tone="white"
      hairline
      aria-labelledby="guides-hubs-heading"
    >
      <SectionHead
        eyebrow={guides.eyebrow}
        title={guides.title}
        titleId="guides-hubs-heading"
        description={guides.description}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <AdminSectionEdit
              href={`${CMS_DESIGN_HREF}#design-guides`}
              label="Edit section"
            />
            <Link href="/guides" className="btn btn-secondary">
              {guides.ctaLabel || "All guides"}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        }
      />

      <ul className="hub-follow grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {guideHubs.map((hub) => (
          <li key={hub.slug}>
            <Link
              href={`/guides/${hub.slug}`}
              className="panel-interactive group flex h-full gap-3 p-4"
            >
              <span className="icon-tile">
                <NavIcon name={hub.icon} size={18} />
              </span>
              <span className="min-w-0">
                <span className="card-title block">{hub.title}</span>
                <span className="card-body mt-1 block line-clamp-2">
                  {hub.description}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
