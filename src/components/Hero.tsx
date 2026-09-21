import Image from "next/image";
import Link from "next/link";
import { Leaf, Trees } from "lucide-react";
import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign } from "@/lib/site-design";

/**
 * Full-viewport photo hero.
 * NOTE: do not use Tailwind `text-white` / `bg-white` here — in dark mode
 * `--white` is remapped to a dark surface, so those utilities go dark.
 * Use `text-hero-type` (cream in both themes) on the photo.
 */
export function Hero() {
  const { hero } = getSiteDesign();

  return (
    <section
      id="top"
      className="relative flex min-h-[100dvh] items-center overflow-hidden"
      aria-labelledby="hero-heading"
    >
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={hero.image}
          alt={hero.imageAlt || ""}
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: hero.objectPosition || "center" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/15 sm:via-black/35 sm:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/25" />
      </div>

      <div className="absolute right-4 top-24 z-10 md:right-8 md:top-28">
        <AdminSectionEdit
          href={`${CMS_DESIGN_HREF}#design-hero`}
          label="Edit hero"
          variant="on-photo"
        />
      </div>

      {hero.imageCaption ? (
        <p className="absolute bottom-5 right-5 z-10 max-w-[16rem] text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-hero-type/80 sm:bottom-8 sm:right-8">
          {hero.imageCaption}
        </p>
      ) : null}

      <div className="section-shell relative z-10 w-full pb-24 pt-28 md:pb-28 md:pt-32">
        <div className="max-w-xl xl:max-w-2xl">
          <h1
            id="hero-heading"
            className="animate-fade-up font-display text-hero text-hero-type [text-shadow:0_1px_3px_rgba(0,0,0,0.45)]"
          >
            {hero.tagline}
          </h1>

          <p className="animate-fade-up animate-delay-2 mt-5 max-w-lg text-lead text-hero-type/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)]">
            {hero.subtitle}
          </p>

          <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href={hero.ctaPrimary.href}
              className="btn btn-block border border-transparent bg-hero-type text-near-black hover:bg-hero-type/90 sm:w-auto sm:min-w-[11rem]"
            >
              {hero.ctaPrimary.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={hero.ctaSecondary.href}
              className="btn btn-block border border-hero-type/75 bg-transparent text-hero-type hover:border-hero-type hover:bg-hero-type/10 sm:w-auto sm:min-w-[11rem]"
            >
              {hero.ctaSecondary.label}
            </Link>
          </div>

          {hero.showFromTheRoad ? (
            <div className="animate-fade-up animate-delay-3 mt-10 hidden sm:block">
              <p className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-hero-type">
                <Trees
                  size={14}
                  strokeWidth={2}
                  className="text-accent"
                  aria-hidden="true"
                />
                {hero.fromTheRoad.label}
              </p>
              <ul className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-hero-type/85">
                {hero.fromTheRoad.items.map((item, i) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    {i > 0 ? (
                      <span
                        className="mx-1.5 text-hero-type/45"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                    ) : null}
                    <Leaf
                      size={12}
                      strokeWidth={2}
                      className="shrink-0 text-accent"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
