import Image from "next/image";
import Link from "next/link";
import { hero } from "@/data/content";

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-[88svh] items-end justify-center overflow-hidden bg-near-black md:min-h-[92svh]"
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
        className="absolute inset-0 bg-gradient-to-t from-near-black/75 via-near-black/30 to-near-black/45"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-5 pb-16 pt-36 text-center md:px-8 md:pb-24 md:pt-44">
        <p className="animate-fade-up inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-white/90 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
          Personal travel journal
        </p>
        <h1
          id="hero-heading"
          className="animate-fade-up animate-delay-1 font-display mt-5 text-[2.25rem] font-bold leading-[1.08] tracking-tight text-hero-type sm:text-5xl md:text-6xl lg:text-[3.25rem]"
        >
          {hero.tagline}
        </h1>
        <p className="animate-fade-up animate-delay-2 mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/85 md:text-lg">
          {hero.subtitle}
        </p>
        <div className="animate-fade-up animate-delay-3 mt-8 flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center">
          <Link href="/destinations" className="btn btn-primary btn-block sm:w-auto sm:min-w-[10.5rem]">
            {hero.ctaPrimary}
          </Link>
          <Link
            href="/blog"
            className="btn btn-block border border-white/35 bg-white/10 text-white hover:bg-white/20 sm:w-auto sm:min-w-[10.5rem]"
          >
            {hero.ctaSecondary}
          </Link>
        </div>
      </div>
    </section>
  );
}
