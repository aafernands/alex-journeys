import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Travel Wallet",
  description:
    "Currency exchange, emergency funds, and how I manage money abroad — personal tips from the journal.",
};

export default function TravelWalletPage() {
  const page = getPageBySlug("travel-wallet");
  if (!page) notFound();

  return (
    <SitePage
      label={page.label}
      title={page.title}
      description={page.description}
      html={page.contentHtml}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/guides/money-budget", label: "Money & budget" },
        { label: "Travel Wallet" },
      ]}
    />
  );
}
