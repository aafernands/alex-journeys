import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Policies & Disclosures",
  description:
    "Privacy policy (including Google Sign-In / OAuth for Fernandes Journeys), terms of use, affiliate disclosure, comments policy, and cookies.",
  alternates: { canonical: "/policies" },
};

export default function PoliciesPage() {
  const page = getPageBySlug("policies");
  if (!page) notFound();

  return (
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
  );
}
