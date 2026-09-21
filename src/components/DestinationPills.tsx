import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { DestinationCarousel } from "@/components/destinations/DestinationCarousel";
import { Section, SectionHead } from "@/components/ui/Section";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getAllDestinations } from "@/data/destinations";
import { getSiteDesign } from "@/lib/site-design";

export function DestinationPills() {
  const { places } = getSiteDesign().homeSections;
  const destinations = getAllDestinations();

  return (
    <Section
      id="where-next"
      tone="soft"
      hairline
      aria-labelledby="where-next-heading"
    >
      <div className="relative">
        <div className="absolute right-0 top-0 z-[1]">
          <AdminSectionEdit
            href={`${CMS_DESIGN_HREF}#design-places`}
            label="Edit section"
          />
        </div>
        <SectionHead
          eyebrow={places.eyebrow}
          title={places.title}
          titleId="where-next-heading"
          description={places.description}
          align="center"
        />
      </div>

      <DestinationCarousel
        className="hub-follow"
        destinations={destinations}
        labelledBy="where-next-heading"
      />
    </Section>
  );
}
