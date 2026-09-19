import type { Metadata } from "next";
import { ContactForm } from "@/components/pages/ContactForm";
import { SitePage } from "@/components/pages/SitePage";
import { site } from "@/data/content";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Alex — trip notes, collaborations, or a friendly hello from the road.",
};

export default function ContactPage() {
  return (
    <SitePage
      label="Hello"
      title="Contact me"
      description="I’d love to hear from you. Say hello about a trip you’ve taken, a story idea, or just to share a photo from the road — this is a personal journal, not a booking desk."
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Contact" },
      ]}
    >
      <ContactForm />
      <aside className="panel-soft mt-12 p-6">
        <p className="font-display text-lg font-bold text-heading">Prefer email?</p>
        <p className="mt-2 text-sm leading-relaxed text-text">
          Reach me at{" "}
          <a href={`mailto:${site.email}`} className="text-link hover:text-accent">
            {site.email}
          </a>
          . I read every message — replies may take a few days if I’m mid-itinerary.
        </p>
      </aside>
    </SitePage>
  );
}
