import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { site } from "@/data/content";

/**
 * Crawlable, discreet homepage note so Google’s OAuth branding review
 * sees the app name and purpose on the Application home page URL.
 */
export function OauthAppNote() {
  return (
    <Section
      id="about-google-signin"
      tone="soft"
      hairline
      size="md"
      aria-labelledby="oauth-app-heading"
    >
      <div className="panel border border-border px-5 py-5 md:px-6 md:py-6">
        <p className="eyebrow">About this site &amp; Google Sign-In</p>
        <h2
          id="oauth-app-heading"
          className="font-display mt-2 text-lg font-bold tracking-tight text-heading md:text-xl"
        >
          {site.name}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text">
          This is a personal travel journal. Public content is viewable without
          login. Google Sign-In is only for optional reader saved posts and for
          the owner&apos;s private content management system (
          <code className="text-xs">/cms</code>) — not a consumer login product.
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
