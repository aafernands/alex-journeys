import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { Section } from "@/components/ui/Section";
import { FeaturedSlideshowView } from "@/components/home/FeaturedSlideshow";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign, visibleFeaturedSlides } from "@/lib/site-design";

/**
 * Post-hero field-note card. Driven by Website Design → Featured slideshow,
 * never by the homepage hero image.
 */
export function FeaturedFieldNote() {
  const { featuredSlideshow } = getSiteDesign();
  if (!featuredSlideshow.enabled) return null;

  const slides = visibleFeaturedSlides(featuredSlideshow);
  if (!slides.length) return null;

  return (
    <Section
      id="featured-field-note"
      tone="soft"
      hairline
      aria-labelledby="featured-field-note-heading"
    >
      <div className="relative">
        <div className="absolute right-0 top-0 z-[1]">
          <AdminSectionEdit
            href={`${CMS_DESIGN_HREF}#design-featured`}
            label="Edit slideshow"
          />
        </div>
      <FeaturedSlideshowView
        slideshow={featuredSlideshow}
        slides={slides}
        headingId="featured-field-note-heading"
      />
      </div>
    </Section>
  );
}
