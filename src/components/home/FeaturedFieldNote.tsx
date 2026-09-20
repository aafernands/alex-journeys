import { Section } from "@/components/ui/Section";
import { FeaturedSlideshowView } from "@/components/home/FeaturedSlideshow";
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
      size="md"
      aria-labelledby="featured-field-note-heading"
    >
      <FeaturedSlideshowView
        slideshow={featuredSlideshow}
        slides={slides}
        headingId="featured-field-note-heading"
      />
    </Section>
  );
}
