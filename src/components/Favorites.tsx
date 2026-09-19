import { favorites } from "@/data/content";

export function Favorites() {
  return (
    <section
      id="favorites"
      className="border-b border-sand/50 bg-ink text-cream"
      aria-labelledby="favorites-heading"
    >
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">
        <div className="mb-10 max-w-2xl md:mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sand">
            From the road
          </p>
          <h2
            id="favorites-heading"
            className="font-display mt-2 text-3xl tracking-tight text-cream sm:text-4xl md:text-5xl"
          >
            Favorites from the road
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-cream/70 md:text-base">
            <span className="sample-badge !bg-ink !text-sand !border-sand/30">
              Sample picks
            </span>{" "}
            Stays, cafés, gear, and rituals I liked — stand-ins until I publish my
            own shortlist.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {favorites.map((item) => (
            <li
              key={item.name}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-terracotta/50 hover:bg-white/[0.07]"
            >
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-terracotta">
                {item.category}
              </p>
              <h3 className="font-display mt-3 text-2xl text-cream">{item.name}</h3>
              <p className="mt-1 text-sm text-sand">{item.place}</p>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-cream/65">
                {item.note}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
