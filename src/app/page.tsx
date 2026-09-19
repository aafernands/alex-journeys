import { Hero } from "@/components/Hero";
import { AuthorIntro } from "@/components/home/AuthorIntro";
import { StartHereCards } from "@/components/home/StartHereCards";
import { DestinationPills } from "@/components/DestinationPills";
import { HiddenGems } from "@/components/HiddenGems";
import { LatestPosts } from "@/components/LatestPosts";

export default function HomePage() {
  return (
    <>
      <a
        href="#author"
        className="absolute left-4 top-4 z-[100] -translate-y-16 rounded-md bg-heading px-4 py-2 text-sm text-white transition focus:translate-y-0"
      >
        Skip to intro
      </a>
      <main className="flex-1">
        <Hero />
        <AuthorIntro />
        <StartHereCards />
        <DestinationPills />
        <HiddenGems />
        <LatestPosts />
      </main>
    </>
  );
}
