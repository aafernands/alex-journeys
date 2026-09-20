import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PoliciesHashRedirect } from "@/components/pages/PoliciesHashRedirect";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Policies & Disclosures",
  description:
    "Hub for Fernandes Journeys legal pages: Privacy Policy, Terms of Use, and Affiliate & monetization disclosure.",
  alternates: { canonical: "/policies" },
};

export default function PoliciesPage() {
  const page = getPageBySlug("policies");
  if (!page) notFound();

  return (
    <>
      <PoliciesHashRedirect />
      <SitePage
        label={page.label}
        title={page.title}
        description={page.description}
        html={page.contentHtml}
        crumbs={[
          { href: "/", label: "Home" },
          { label: "Policies" },
        ]}
      />
    </>
  );
}
