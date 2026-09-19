import Image from "next/image";
import { hero } from "@/data/content";

export function Hero() {
  return (
    <section
      id="top"
      className="grain relative overflow-hidden border-b border-sand/50 bg-cream"
      aria-labelledby="hero-heading"
    >
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-12 md:items-center md:gap-12 md:px-8 md:py-20 lg:py-24">
        <div className="md:col-span-6 lg:col-span-5">
          <p className="animate-fade-up sample-badge mb-5">
            Sample content · replace freely
          </p>
          <p className="animate-fade-up animate-delay-1 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
            {hero.eyebrow}
          </p>
          <h1
            id="hero-heading"
            className="animate-fade-up animate-delay-1 font-display mt-3 text-5xl leading-[1.05] tracking-tight text-ink sm:text-6xl lg:text-7xl"
          >
            {hero.title}
          </h1>
          <p className="animate-fade-up animate-delay-2 mt-5 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
            {hero.subtitle}
          </p>
          <div className="animate-fade-up animate-delay-3 mt-8 flex flex-wrap gap-3">
            <a
              href="#stories"
              className="inline-flex items-center justify-center rounded-full bg-terracotta px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-terracotta-deep focus-visible:outline-offset-4"
            >
              {hero.ctaPrimary}
            </a>
            <a
              href="#newsletter"
              className="inline-flex items-center justify-center rounded-full border border-ink/15 bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-terracotta/40 hover:text-terracotta"
            >
              {hero.ctaSecondary}
            </a>
          </div>
        </div>

        <div className="animate-fade-up animate-delay-2 relative md:col-span-6 lg:col-span-7">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-[0_24px_60px_-28px_rgba(28,25,23,0.45)] sm:aspect-[5/4] md:aspect-[4/3]">
            <Image
              src={hero.image}
              alt={hero.imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 55vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/25 via-transparent to-transparent" />
          </div>
          <div className="absolute -bottom-4 -left-2 hidden rounded-xl border border-sand/80 bg-surface/95 px-4 py-3 shadow-lg backdrop-blur sm:block md:-left-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">
              Currently
            </p>
            <p className="font-display text-lg text-ink">Somewhere between trips</p>
          </div>
        </div>
      </div>
    </section>
  );
}
