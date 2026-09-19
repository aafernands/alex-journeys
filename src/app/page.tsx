import { Hero } from "@/components/Hero";
import { Stories } from "@/components/Stories";
import { About } from "@/components/About";
import { Favorites } from "@/components/Favorites";
import { Newsletter } from "@/components/Newsletter";

export default function HomePage() {
  return (
    <>
      <a
        href="#stories"
        className="absolute left-4 top-4 z-[100] -translate-y-16 rounded-full bg-ink px-4 py-2 text-sm text-cream transition focus:translate-y-0"
      >
        Skip to stories
      </a>
      <main className="flex-1">
        <Hero />
        <Stories />
        <About />
        <Favorites />
        <Newsletter />
      </main>
    </>
  );
}
