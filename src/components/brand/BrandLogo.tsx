import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/content";

const COLOR_SRC = "/brand/logo-fernandes-journeys.svg";
const WHITE_SRC = "/brand/logo-fernandes-journeys-white.svg";

type Props = {
  /** Tailwind height class for the image, e.g. h-8 or h-10 */
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /**
   * `auto` — color mark in light mode, white in dark mode.
   * `on-dark` — always the white mark (near-black footer, photo overlays).
   */
  variant?: "auto" | "on-dark";
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
 * Site wordmark. Light surfaces use the color SVG; dark surfaces use white.
 * `variant="on-dark"` always shows white (footer is near-black in both themes).
 */
export function BrandLogo({
  className = "h-8 w-auto",
  width = 180,
  height = 54,
  priority = false,
  variant = "auto",
  linked = true,
  href = site.url,
  onClick,
}: Props) {
  const mark =
    variant === "on-dark" ? (
      <Image
        src={WHITE_SRC}
        alt={site.name}
        width={width}
        height={height}
        className={className}
        priority={priority}
        unoptimized
      />
    ) : (
      <span className="relative inline-flex items-center">
        <Image
          src={COLOR_SRC}
          alt={site.name}
          width={width}
          height={height}
          className={`${className} dark:hidden`}
          priority={priority}
          unoptimized
        />
        <Image
          src={WHITE_SRC}
          alt={site.name}
          width={width}
          height={height}
          className={`${className} hidden dark:block`}
          priority={priority}
          unoptimized
        />
      </span>
    );

  if (!linked) return mark;

  return (
    <Link
      href={href}
      className="inline-flex max-w-full items-center opacity-95 transition hover:opacity-100"
      aria-label={`${site.name} home`}
      onClick={onClick}
    >
      {mark}
    </Link>
  );
}
