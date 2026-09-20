import Image from "next/image";

type Props = {
  /** Tailwind height class for the image, e.g. h-8 or h-10 */
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

/**
 * Site wordmark — color logo in light mode, white logo in dark mode.
 * Switches via `html.dark` (no client JS needed).
 */
export function BrandLogo({
  className = "h-8 w-auto",
  width = 180,
  height = 54,
  priority = false,
}: Props) {
  return (
    <span className="relative inline-flex items-center">
      <Image
        src="/brand/logo-alex-journly.png"
        alt="Fernandes Journeys"
        width={width}
        height={height}
        className={`${className} dark:hidden`}
        priority={priority}
      />
      <Image
        src="/brand/logo-alex-journly-white.png"
        alt="Fernandes Journeys"
        width={width}
        height={height}
        className={`${className} hidden dark:block`}
        priority={priority}
      />
    </span>
  );
}
