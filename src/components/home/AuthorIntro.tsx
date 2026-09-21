import Image from "next/image";
import Link from "next/link";
import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { Section } from "@/components/ui/Section";
import { site } from "@/data/content";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign } from "@/lib/site-design";

export function AuthorIntro() {
  const { author } = getSiteDesign().homeSections;
  const photoSrc = author.photo.trim() || site.authorPhoto;
  const photoAlt = author.photoAlt.trim() || site.authorName;

  return (
    <Section
      id="author"
      tone="soft"
      hairline
      size="md"
      aria-labelledby="author-heading"
    >
      <div className="grid items-center gap-8 md:gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <div className="panel overflow-hidden shadow-sm">
            <div className="relative aspect-[4/5] bg-surface-soft sm:aspect-[3/4]">
              <Image
                src={photoSrc}
                alt={photoAlt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-top"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative lg:col-span-7">
          <div className="absolute right-0 top-0">
            <AdminSectionEdit
              href={`${CMS_DESIGN_HREF}#design-author`}
              label="Edit intro"
            />
          </div>
          <p className="eyebrow">{author.eyebrow}</p>
          <h2
            id="author-heading"
            className="font-display mt-2 text-display text-heading"
          >
            {author.headline}
          </h2>
          <p className="mt-4 max-w-xl text-lead text-text">{author.body}</p>
          <p className="mt-7">
            <Link
              href={author.primaryCta.href || "/about"}
              className="text-link inline-flex items-center gap-1.5 text-sm font-semibold hover:text-accent"
            >
              {author.primaryCta.label?.trim() || "Learn more about me"}
              <span aria-hidden="true">→</span>
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
