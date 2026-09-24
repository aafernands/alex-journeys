import Image from "next/image";
import { isOptimizedAvatarSrc } from "@/lib/avatar-image";

type Size = "identity" | "settings";

type Props = {
  src: string | null;
  name: string;
  email?: string;
  /**
   * `identity` — account overview (64px, 80px from sm).
   * `settings` — profile form preview (64px).
   */
  size?: Size;
  alt?: string;
};

function initials(name: string, email: string): string {
  const source = name.trim() || email.trim() || "AJ";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/**
 * Account identity photo. Google and X URLs use next/image (same hosts as
 * the header avatar). Uploads and other links stay a plain img.
 */
export function ProfileAvatar({
  src,
  name,
  email = "",
  size = "identity",
  alt,
}: Props) {
  const label = alt ?? (name.trim() ? `${name.trim()} photo` : "");
  const photoClass =
    size === "settings"
      ? "h-16 w-16 shrink-0 rounded-full border border-border object-cover"
      : "h-16 w-16 shrink-0 rounded-full border border-border object-cover sm:h-20 sm:w-20";
  const fallbackClass =
    size === "settings"
      ? "inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface-soft font-display text-lg font-bold text-accent"
      : "inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border bg-surface-soft font-display text-lg font-bold text-accent sm:h-20 sm:w-20 sm:text-xl";
  const px = size === "settings" ? 64 : 80;

  if (!src) {
    return (
      <span className={fallbackClass} aria-hidden="true">
        {initials(name, email)}
      </span>
    );
  }

  if (!isOptimizedAvatarSrc(src)) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img src={src} alt={label} width={px} height={px} className={photoClass} />
    );
  }

  return (
    <Image src={src} alt={label} width={px} height={px} className={photoClass} />
  );
}
