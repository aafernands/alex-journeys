import Image from "next/image";
import Link from "next/link";
import { Leaf, Trees } from "lucide-react";
import { getSiteDesign } from "@/lib/site-design";

/**
 * Full-viewport photo hero — sharp image, no blur.
 * Readability comes from a crisp left-side gradient (not a frosted card).
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
        {/* Crisp gradient only — keeps most of the photo vivid */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10 sm:via-black/30 sm:to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
      </div>

      {hero.imageCaption ? (
        <p className="absolute bottom-5 right-5 z-10 max-w-[16rem] text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-white/85 sm:bottom-8 sm:right-8">
          {hero.imageCaption}
        </p>
      ) : null}

      <div className="section-shell relative z-10 w-full pb-24 pt-28 md:pb-28 md:pt-32">
        <div className="max-w-xl xl:max-w-2xl">
          <h1
            id="hero-heading"
            className="animate-fade-up font-display text-hero text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
          >
            {hero.tagline}
          </h1>

          <p className="animate-fade-up animate-delay-2 mt-5 max-w-lg text-lead text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.25)]">
            {hero.subtitle}
          </p>

          <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href={hero.ctaPrimary.href}
              className="btn btn-block border border-transparent bg-white text-heading hover:bg-white/90 sm:w-auto sm:min-w-[11rem]"
            >
              {hero.ctaPrimary.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={hero.ctaSecondary.href}
              className="btn btn-block border border-white/70 bg-transparent text-white hover:border-white hover:bg-white/10 sm:w-auto sm:min-w-[11rem]"
            >
              {hero.ctaSecondary.label}
            </Link>
          </div>

          {hero.showFromTheRoad ? (
            <div className="animate-fade-up animate-delay-3 mt-10 hidden sm:block">
              <p className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-white">
                <Trees
                  size={14}
                  strokeWidth={2}
                  className="text-accent"
                  aria-hidden="true"
                />
                {hero.fromTheRoad.label}
              </p>
              <ul className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-white/85">
                {hero.fromTheRoad.items.map((item, i) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    {i > 0 ? (
                      <span className="mx-1.5 text-white/45" aria-hidden="true">
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
