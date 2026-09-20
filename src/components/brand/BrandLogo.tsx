import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/content";

type Props = {
  /** Tailwind height class for the image, e.g. h-8 or h-10 */
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /**
   * When true (default), the mark links to the public site URL.
   * Set false only if a parent already wraps an anchor.
   */
  linked?: boolean;
  /** Override destination; defaults to https://www.fernandesjourneys.com */
  href?: string;
  onClick?: () => void;
};

/**
 * Site wordmark — color logo in light mode, white logo in dark mode.
 * Switches via `html.dark` (no client JS needed). Links to the site URL by default.
 */
export function BrandLogo({
  className = "h-8 w-auto",
  width = 180,
  height = 54,
  priority = false,
  linked = true,
  href = site.url,
  onClick,
}: Props) {
  const mark = (
    <span className="relative inline-flex items-center">
      <Image
        src="/brand/logo-fernandes-journeys.png"
        alt={site.name}
        width={width}
        height={height}
        className={`${className} dark:hidden`}
        priority={priority}
      />
      <Image
        src="/brand/logo-fernandes-journeys-white.png"
        alt={site.name}
        width={width}
        height={height}
        className={`${className} hidden dark:block`}
        priority={priority}
      />
    </span>
  );

  if (!linked) return mark;

  return (
    <Link
      href={href}
      className="inline-flex items-center opacity-95 transition hover:opacity-100"
      aria-label={`${site.name} home`}
      onClick={onClick}
    >
      {mark}
    </Link>
  );
}
