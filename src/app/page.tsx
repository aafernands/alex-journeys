import { Hero } from "@/components/Hero";
import { AuthorIntro } from "@/components/home/AuthorIntro";
import { OauthAppNote } from "@/components/home/OauthAppNote";
import { GuidesHubStrip } from "@/components/home/GuidesHubStrip";
import { StartHereCards } from "@/components/home/StartHereCards";
import { ToolsStrip } from "@/components/home/ToolsStrip";
import { DestinationPills } from "@/components/DestinationPills";
import { LatestPosts } from "@/components/LatestPosts";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <a
        href="#start-here-cards"
        className="absolute left-4 top-4 z-[100] -translate-y-16 rounded-md bg-ink px-4 py-2 text-sm text-on-solid transition focus:translate-y-0"
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
        <OauthAppNote />
        <AuthorIntro />
      </main>
    </>
  );
}
