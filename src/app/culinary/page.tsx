import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Culinary Adventures",
  description:
    "Exploring the world one bite at a time — Iceland, Brazil, and street-food finds from the road.",
};

export default function CulinaryPage() {
  const page = getPageBySlug("culinary");
  if (!page) notFound();

  return (
    <SitePage
      label={page.label}
      title={page.title}
      description={page.description}
      html={page.contentHtml}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides/experiences", label: "Experiences" },
        { label: "Culinary" },
      ]}
    >
      <p className="mt-10 text-sm text-muted">
        Related:{" "}
        <Link href="/blog/wine-lovers-destinations" className="text-link hover:text-accent">
          wine destinations
        </Link>
        {" · "}
        <Link href="/blog/nj-wine-expo-2024" className="text-link hover:text-accent">
          NJ Wine Expo
        </Link>
        {" · "}
        <Link href="/guides/experiences" className="text-link hover:text-accent">
          all experiences
        </Link>
      </p>
    </SitePage>
  );
}
