"use client";

import Image from "next/image";
import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PerkRailItem = {
  id: string;
  title: string;
  detail: string;
  comingSoon?: boolean;
  photo: string;
  photoPosition?: string;
};

export function PremiumPerkRail({ items }: { items: PerkRailItem[] }) {
  const railRef = useRef<HTMLUListElement>(null);

  function scrollBy(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 16 : rail.clientWidth * 0.8;
    rail.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <div className="relative">
      <ul
        ref={railRef}
        className="premium-rail -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-2 md:mx-0 md:scroll-px-0 md:px-0"
        aria-label="What’s inside Premium"
      >
        {items.map((item) => (
          <li
            key={item.id}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[calc((100%-3rem)/4)]"
          >
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white">
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-surface">
                <Image
                  src={item.photo}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 78vw, (max-width: 1024px) 46vw, 300px"
                  className="object-cover"
                  style={{ objectPosition: item.photoPosition ?? "center" }}
                />
                <div className="premium-rail-scrim absolute inset-0" aria-hidden="true" />
                <span
                  className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] ${
                    item.comingSoon ? "bg-near-black/75 text-hero-type" : "bg-accent text-on-solid"
                  }`}
                >
                  {item.comingSoon ? "Coming soon" : "Included"}
                </span>
                <h3 className="absolute inset-x-4 bottom-4 font-display text-xl font-bold leading-tight text-hero-type">
                  {item.title}
                </h3>
              </div>
              <p className="flex-1 p-4 text-sm leading-relaxed text-text">{item.detail}</p>
            </article>
          </li>
        ))}
      </ul>
      <div className="mt-4 hidden justify-end gap-2 md:flex">
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full border border-border-strong bg-white text-heading transition hover:bg-surface-soft"
          aria-label="Previous"
          onClick={() => scrollBy(-1)}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-full border border-border-strong bg-white text-heading transition hover:bg-surface-soft"
          aria-label="Next"
          onClick={() => scrollBy(1)}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
