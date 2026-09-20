import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SitePage } from "@/components/pages/SitePage";
import { getPageBySlug } from "@/lib/pages";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Fernandes Journeys collects and uses information — public browsing, reader accounts, Turnstile, Resend, Mailchimp, cookies, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const page = getPageBySlug("privacy");
  if (!page) notFound();

  return (
    <SitePage
      label={page.label}
      title={page.title}
      description={page.description}
      html={page.contentHtml}
      crumbs={[
        { href: "/", label: "Home" },
        { href: "/policies", label: "Policies" },
        { label: "Privacy" },
      ]}
    />
  );
}
