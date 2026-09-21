import type { ReactNode } from "react";
import { PinterestPinButton } from "@/components/pinterest/PinterestPinButton";
import { isPinnableImageSrc, toAbsoluteMediaUrl } from "@/lib/pinterest";
import { absoluteUrl } from "@/lib/seo";

type Props = {
  /** Canonical site path for the current page, e.g. `/niagara-falls`. */
  pagePath: string;
  mediaSrc: string;
  description: string;
  children: ReactNode;
  className?: string;
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Overlay a Pinterest Pin control on a content photo (typically next/image).
 * Decorative srcs (brand, logos, avatars) render children unchanged.
 * Visibility: CSS hover/focus + tap-to-reveal via `PinterestPinReveal`.
 */
export function PinnableImage({
  pagePath,
  mediaSrc,
  description,
  children,
  className,
}: Props) {
  if (!isPinnableImageSrc(mediaSrc)) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cx("pinnable-image", className)}>
      {children}
      <PinterestPinButton
        pageUrl={absoluteUrl(pagePath)}
        mediaUrl={toAbsoluteMediaUrl(mediaSrc)}
        description={description}
      />
    </div>
  );
}
