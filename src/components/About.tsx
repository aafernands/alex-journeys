import Image from "next/image";
import { about } from "@/data/content";

export function About() {
  return (
    <section
      id="about"
      className="border-b border-sand/50 bg-cream"
      aria-labelledby="about-heading"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-12 md:gap-14 md:px-8 md:py-24">
        <div className="relative md:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src="https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1000&q=80"
              alt="Traveler walking through a sunlit European alley"
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          <div className="absolute -right-3 top-6 hidden rounded-lg bg-sage-soft px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sage md:block">
            Past trips
          </div>
        </div>

        <div className="md:col-span-7">
          <p className="sample-badge">Sample bio</p>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-sage">
            About
          </p>
          <h2
            id="about-heading"
            className="font-display mt-2 text-3xl tracking-tight text-ink sm:text-4xl md:text-5xl"
          >
            {about.headline}
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-ink-soft md:text-lg">
            {about.paragraphs.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-sand/70 pt-8">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Focus
              </dt>
              <dd className="font-display mt-1 text-xl text-ink">Trip notes</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Based
              </dt>
              <dd className="font-display mt-1 text-xl text-ink">East Coast</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Format
              </dt>
              <dd className="font-display mt-1 text-xl text-ink">Essays + film</dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
