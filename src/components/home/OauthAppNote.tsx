import Link from "next/link";
import { AdminSectionEdit } from "@/components/admin/AdminPublicChrome";
import { Section } from "@/components/ui/Section";
import { site } from "@/data/content";
import { CMS_DESIGN_HREF } from "@/lib/admin-edit";
import { getSiteDesign } from "@/lib/site-design";

/**
 * Crawlable, discreet homepage note so Google’s OAuth branding review
 * sees the app name and purpose on the Application home page URL.
 */
export function OauthAppNote() {
  const { oauthNote } = getSiteDesign().homeSections;
  const title = oauthNote.title.trim() || site.name;

  return (
    <Section
      id="about-google-signin"
      tone="soft"
      hairline
      size="md"
      aria-labelledby="oauth-app-heading"
    >
      <div className="panel relative border border-border p-4">
        <div className="absolute right-4 top-4">
          <AdminSectionEdit
            href={`${CMS_DESIGN_HREF}#design-oauth`}
            label="Edit note"
          />
        </div>
        <p className="eyebrow">{oauthNote.eyebrow}</p>
        <h2
          id="oauth-app-heading"
          className="font-display mt-2 text-lg font-bold tracking-tight text-heading md:text-xl"
        >
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text">
          {oauthNote.body}
        </p>
        <p className="mt-3 text-sm text-muted">
          <Link
            href="/app"
            className="font-semibold text-link transition hover:text-accent"
          >
            App purpose &amp; Google Sign-In details
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="font-semibold text-link transition hover:text-accent"
          >
            Privacy policy
          </Link>
        </p>
      </div>
    </Section>
  );
}
