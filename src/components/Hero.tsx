import Image from "next/image";
import Link from "next/link";
import { hero } from "@/data/content";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] items-end justify-center overflow-hidden bg-near-black"
      aria-labelledby="hero-heading"
    >
      <Image
        src={hero.image}
        alt={hero.imageAlt}
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-near-black/70 via-near-black/25 to-near-black/40"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-20 pt-36 text-center md:px-8 md:pb-28 md:pt-44">
        <h1
          id="hero-heading"
          className="animate-fade-up font-display text-[2.5rem] font-black uppercase leading-[1.05] tracking-tight text-hero-type sm:text-5xl md:text-6xl lg:text-[3.5rem]"
        >
          {hero.tagline}
        </h1>
        <p className="animate-fade-up animate-delay-1 mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
          {hero.subtitle}
        </p>
        <div className="animate-fade-up animate-delay-2 mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/destinations"
            className="inline-flex items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-accent-deep"
          >
            {hero.ctaPrimary}
          </Link>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/10 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-sm transition hover:bg-white/20"
          >
            {hero.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
