import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/pages/ContactForm";
import { QuickAnswers } from "@/components/pages/QuickAnswers";
import { SitePage } from "@/components/pages/SitePage";
import { site } from "@/data/content";
import { asRecord, asString } from "@/lib/cms-section-utils";
import { PAGE_DEFAULTS } from "@/lib/page-defaults";
import { getPageWithFallback } from "@/lib/pages";
import { parseQuickAnswers } from "@/lib/quick-answers";

export function generateMetadata(): Metadata {
  const page = getPageWithFallback("contact", PAGE_DEFAULTS.contact);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: "/contact" },
  };
}

export default function ContactPage() {
  const page = getPageWithFallback("contact", PAGE_DEFAULTS.contact);
  const form = asRecord(page.sections?.form);
  const quickAnswers = parseQuickAnswers(page.sections?.quickAnswers);
  const formHeading = asString(form.heading, "Still need a hand?");
  const formIntro = asString(
    form.intro,
    "Send me a note and I’ll reply by email, usually within a couple of days.",
  );
  const aside = asRecord(page.sections?.emailAside);
  const mailingAddress = asString(
    page.sections?.mailingAddress,
    "PO BOX 2101 · Ocean, NJ 07712 · USA",
  );
  const asideBody = asString(
    aside.body,
    "Reach me at {email}. I read every message — replies may take a few days if I’m mid-itinerary.",
  ).replace("{email}", site.email);

  return (
    <SitePage
      cmsSlug="contact"
      label={page.label}
      title={page.title}
      description={page.description}
      crumbs={[
        { href: "/", label: "Home" },
        { label: "Help & contact" },
      ]}
    >
      <QuickAnswers data={quickAnswers} />
      <section
        className={quickAnswers.items.length > 0 ? "hub-block" : "hub-follow"}
        aria-labelledby="contact-form-heading"
      >
        <h2 id="contact-form-heading" className="font-display text-lg font-bold text-heading">
          {formHeading}
        </h2>
        {formIntro ? <p className="mt-1 text-sm text-muted">{formIntro}</p> : null}
        <ContactForm
          className="mt-5"
          labels={{
            firstNameLabel: asString(form.firstNameLabel, "First name"),
            lastNameLabel: asString(form.lastNameLabel, "Last name"),
            emailLabel: asString(form.emailLabel, "Email"),
            messageLabel: asString(form.messageLabel, "Message"),
            submitLabel: asString(form.submitLabel, "Send message"),
            successCopy: asString(
              form.successCopy,
              `Opening your email app to send to ${site.email}…`,
            ),
            directEmailHint: asString(
              form.directEmailHint,
              "Or email me directly at",
            ),
          }}
        />
      </section>
      <aside className="panel-soft hub-block p-6">
        <p className="card-title">
          {asString(aside.title, "Prefer email?")}
        </p>
        <p className="card-body mt-2">
          {asideBody}{" "}
          <Link href="/privacy" className="text-link hover:text-accent">
            Read the Privacy Policy
          </Link>
          .
        </p>
        <div className="mt-5 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Mailing address
          </p>
          <address className="mt-2 not-italic text-sm font-semibold text-heading">
            {mailingAddress}
          </address>
        </div>
      </aside>
    </SitePage>
  );
}
