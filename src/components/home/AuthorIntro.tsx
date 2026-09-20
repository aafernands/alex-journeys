import Image from "next/image";
import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { site } from "@/data/content";
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

        <div className="lg:col-span-7">
          <p className="eyebrow">{author.eyebrow}</p>
          <h2
            id="author-heading"
            className="font-display mt-2 text-display text-heading"
          >
            {author.headline}
          </h2>
          <p className="mt-4 max-w-xl text-lead text-text">{author.body}</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={author.primaryCta.href}
              className="btn btn-ink btn-block sm:w-auto"
            >
              {author.primaryCta.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={author.secondaryCta.href}
              className="btn btn-secondary btn-block sm:w-auto"
            >
              {author.secondaryCta.label}
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}
