import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Affiliate & Monetization Disclosure",
  description:
    "FTC affiliate disclosure for Alex Journeys — commissions, partner examples, /tools outbound links, and that opinions are Alex’s own.",
  alternates: { canonical: "/affiliate-disclosure" },
};

export default function AffiliateDisclosurePage() {
  const page = getPageBySlug("affiliate-disclosure");
  if (!page) notFound();

  return (
    <SitePage
      cmsSlug="affiliate-disclosure"
      label={page.label}
      title={page.title}
      description={page.description}
      html={page.contentHtml}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/policies", label: "Policies" },
        { label: "Affiliate disclosure" },
      ]}
    />
  );
}
