import { Hero } from "@/components/Hero";
import { AuthorIntro } from "@/components/home/AuthorIntro";
import { GuidesHubStrip } from "@/components/home/GuidesHubStrip";
import { StartHereCards } from "@/components/home/StartHereCards";
import { ToolsStrip } from "@/components/home/ToolsStrip";
import { DestinationPills } from "@/components/DestinationPills";
import { LatestPosts } from "@/components/LatestPosts";

export default function HomePage() {
  return (
    <>
      <a
        href="#start-here-cards"
        className="absolute left-4 top-4 z-[100] -translate-y-16 rounded-md bg-heading px-4 py-2 text-sm text-white transition focus:translate-y-0"
      >
        Skip to start here
      </a>
      <main className="flex-1">
        <Hero />
        <StartHereCards />
        <DestinationPills />
        <LatestPosts />
        <GuidesHubStrip />
        <ToolsStrip />
        <AuthorIntro />
      </main>
    </>
  );
}
