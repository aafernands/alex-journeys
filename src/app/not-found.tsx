import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

/** Friendly 404 inside the normal site header and footer. */
export default function NotFound() {
  return (
    <main className="bg-bg">
      <div className="section-shell section-band">
        <div className="mx-auto max-w-md text-center">
          <p className="eyebrow text-accent">Off the map</p>
          <h1 className="font-display mt-2 text-display text-heading">This page wandered off</h1>
          <p className="mt-3 text-sm text-muted md:text-base">
            The link may be old, or the page has moved. Try one of these instead.
          </p>
          <div className="mt-6 space-y-3">
            <Link href="/" className="btn btn-primary btn-block">
              Back to the homepage
            </Link>
            <Link href="/destinations" className="btn btn-secondary btn-block">
              Browse places
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted">
            Looking for something specific?{" "}
            <Link href="/contact" className="font-semibold text-accent hover:underline">
              Get in touch
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
