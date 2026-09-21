import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms and conditions for using Fernandes Journeys — personal use, no travel agency, acceptable use, accounts, and liability limits.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const page = getPageBySlug("terms");
  if (!page) notFound();

  return (
    <SitePage
      cmsSlug="terms"
      label={page.label}
      title={page.title}
      description={page.description}
      html={page.contentHtml}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/policies", label: "Policies" },
        { label: "Terms" },
      ]}
    />
  );
}
