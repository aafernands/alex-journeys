import Image from "next/image";
import Link from "next/link";
import { Leaf, Trees } from "lucide-react";
import { getSiteDesign } from "@/lib/site-design";

export function Hero() {
  const design = getSiteDesign();
  const { hero } = design;

  return (
    <section
      id="top"
      className="relative flex min-h-[100dvh] items-center overflow-hidden border-b border-border"
      aria-labelledby="hero-heading"
    >
      {/* Full-bleed Maroon Bells background */}
      <div className="absolute inset-0" aria-hidden="true">
        <Image
          src={hero.image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: hero.objectPosition || "center" }}
        />
      </div>

      {/* Corner caption — not window chrome */}
      {hero.imageCaption ? (
        <p className="absolute bottom-4 right-4 z-10 max-w-[14rem] text-right text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-heading/70 drop-shadow-sm sm:bottom-6 sm:right-6 dark:text-white/70">
          {hero.imageCaption}
        </p>
      ) : null}

      <div className="section-shell relative z-10 w-full py-20 md:py-24 lg:py-28">
        <div className="max-w-xl xl:max-w-2xl">
          <h1
            id="hero-heading"
            className="animate-fade-up font-display text-hero text-heading"
          >
            {hero.tagline}
          </h1>

          <p className="animate-fade-up animate-delay-2 mt-5 max-w-md text-lead text-text">
            {hero.subtitle}
          </p>

          <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href={hero.ctaPrimary.href}
              className="btn btn-ink btn-block sm:w-auto sm:min-w-[11rem]"
            >
              {hero.ctaPrimary.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={hero.ctaSecondary.href}
              className="btn btn-secondary btn-block sm:w-auto sm:min-w-[11rem]"
            >
              {hero.ctaSecondary.label}
            </Link>
          </div>

          {hero.showFromTheRoad ? (
            <div className="animate-fade-up animate-delay-3 mt-8 hidden sm:block">
              <p className="inline-flex items-center gap-2 text-label text-heading">
                <Trees
                  size={14}
                  strokeWidth={2}
                  className="text-accent"
                  aria-hidden="true"
                />
                {hero.fromTheRoad.label}
              </p>
              <ul className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-text">
                {hero.fromTheRoad.items.map((item, i) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    {i > 0 ? (
                      <span
                        className="mx-1.5 text-muted-light"
                        aria-hidden="true"
                      >
                        ·
                      </span>
                    ) : null}
                    <Leaf
                      size={12}
                      strokeWidth={2}
                      className="shrink-0 text-accent/80"
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
