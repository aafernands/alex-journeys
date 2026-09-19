import Link from "next/link";
import { site } from "@/data/content";

const social = [
  { label: "Instagram", href: site.social.instagram },
  { label: "YouTube", href: site.social.youtube },
  { label: "Pinterest", href: site.social.pinterest },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-cream" role="contentinfo">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-end md:justify-between md:px-8 md:py-14">
        <div>
          <p className="font-display text-2xl text-ink">{site.name}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">{site.tagline}</p>
          <p className="mt-3 flex flex-wrap gap-4">
            <Link
              href="/blog"
              className="text-sm font-medium text-ink-soft transition hover:text-terracotta"
            >
              Blog →
            </Link>
            <Link
              href="/destinations"
              className="text-sm font-medium text-ink-soft transition hover:text-terracotta"
            >
              Destinations →
            </Link>
          </p>
        </div>

        <nav aria-label="Social">
          <ul className="flex flex-wrap gap-5">
            {social.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="text-sm font-medium text-ink-soft transition hover:text-terracotta"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {item.label}
                  <span className="sr-only"> (placeholder link)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-sand/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-5 text-xs text-muted md:flex-row md:items-center md:justify-between md:px-8">
          <p>
            © {year} {site.name}. A personal travel blog — places I’ve been,
            written down.
          </p>
          <p>Social links are placeholders — update in src/data/content.ts</p>
        </div>
      </div>
    </footer>
  );
}
