import Image from "next/image";
import Link from "next/link";
import { Leaf, Trees } from "lucide-react";
import { getSiteDesign } from "@/lib/site-design";

/**
 * Full-bleed hero photo with theme-aware type + contrasting vignette:
 * light mode → black copy on a light wash/vignette
 * dark mode → white copy on a dark wash/vignette
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

        {/* Light mode: pale vignette + left wash so black type contrasts */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            background:
              "radial-gradient(ellipse 78% 72% at 50% 42%, transparent 0%, transparent 38%, rgba(255,252,247,0.45) 72%, rgba(250,246,240,0.88) 100%)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-bg/90 via-bg/55 to-transparent dark:hidden md:from-bg/85 md:via-bg/40" />

        {/* Dark mode: black vignette + left wash so white type contrasts */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            background:
              "radial-gradient(ellipse 75% 70% at 50% 45%, transparent 0%, transparent 40%, rgba(0,0,0,0.35) 75%, rgba(0,0,0,0.72) 100%)",
          }}
        />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-black/65 via-black/30 to-transparent dark:block md:from-black/55 md:via-black/20" />
      </div>

      {hero.imageCaption ? (
        <p className="absolute bottom-5 right-5 z-10 max-w-[16rem] text-right text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-heading/70 dark:text-white/80 sm:bottom-8 sm:right-8">
          {hero.imageCaption}
        </p>
      ) : null}

      <div className="section-shell relative z-10 w-full pb-24 pt-28 md:pb-28 md:pt-32">
        <div className="max-w-xl xl:max-w-2xl">
          <h1
            id="hero-heading"
            className="animate-fade-up font-display text-hero text-heading dark:text-white dark:[text-shadow:0_1px_18px_rgba(0,0,0,0.4)]"
          >
            {hero.tagline}
          </h1>

          <p className="animate-fade-up animate-delay-2 mt-5 max-w-lg text-lead text-text dark:text-white/90 dark:[text-shadow:0_1px_12px_rgba(0,0,0,0.35)]">
            {hero.subtitle}
          </p>

          <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center">
            <Link
              href={hero.ctaPrimary.href}
              className="btn btn-ink btn-block sm:w-auto sm:min-w-[11rem] dark:border-transparent dark:bg-white dark:text-heading dark:hover:bg-white/90"
            >
              {hero.ctaPrimary.label}
              <span aria-hidden="true">→</span>
            </Link>
            <Link
              href={hero.ctaSecondary.href}
              className="btn btn-secondary btn-block sm:w-auto sm:min-w-[11rem] dark:border-white/75 dark:bg-transparent dark:text-white dark:hover:border-white dark:hover:bg-white/10"
            >
              {hero.ctaSecondary.label}
            </Link>
          </div>

          {hero.showFromTheRoad ? (
            <div className="animate-fade-up animate-delay-3 mt-10 hidden sm:block">
              <p className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-heading dark:text-white">
                <Trees
                  size={14}
                  strokeWidth={2}
                  className="text-accent"
                  aria-hidden="true"
                />
                {hero.fromTheRoad.label}
              </p>
              <ul className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-2 text-sm text-text dark:text-white/88">
                {hero.fromTheRoad.items.map((item, i) => (
                  <li key={item} className="inline-flex items-center gap-2">
                    {i > 0 ? (
                      <span
                        className="mx-1.5 text-muted dark:text-white/45"
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
