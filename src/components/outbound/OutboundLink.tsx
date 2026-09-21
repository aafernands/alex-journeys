import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { isOwnHost, outboundHref, parseSafeExternalUrl } from "@/lib/outbound";

type OutboundLinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
  /** Show affiliate disclosure on the interstitial. */
  affiliate?: boolean;
  children: ReactNode;
};

/**
 * Public-facing link that routes external http(s) destinations through /out.
 * Same-site, relative, mailto, and tel hrefs stay direct (no interstitial).
 */
export function OutboundLink({
  href,
  affiliate = false,
  children,
  className,
  rel,
  target,
  ...rest
}: OutboundLinkProps) {
  const trimmed = href.trim();

  if (trimmed.startsWith("/out")) {
    return (
      <a
        href={trimmed}
        className={className}
        rel={rel ?? "noopener noreferrer"}
        target={target ?? "_blank"}
        {...rest}
      >
        {children}
      </a>
    );
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("tel:")
  ) {
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
      return (
        <Link href={trimmed} className={className} {...rest}>
          {children}
        </Link>
      );
    }
    return (
      <a href={trimmed} className={className} {...rest}>
        {children}
      </a>
    );
  }

  let absolute: URL | null = null;
  try {
    absolute = new URL(trimmed);
  } catch {
    absolute = null;
  }

  if (absolute && isOwnHost(absolute)) {
    const path = `${absolute.pathname}${absolute.search}${absolute.hash}` || "/";
    return (
      <Link href={path} className={className} {...rest}>
        {children}
      </Link>
    );
  }

  const safe = parseSafeExternalUrl(trimmed);
  if (!safe) {
    return (
      <a href={trimmed} className={className} rel={rel} target={target} {...rest}>
        {children}
      </a>
    );
  }

  const out = outboundHref(safe.href, { affiliate });
  const nextRel =
    rel ??
    (affiliate ? "noopener noreferrer sponsored" : "noopener noreferrer");

  return (
    <a
      href={out}
      className={className}
      rel={nextRel}
      target={target ?? "_blank"}
      {...rest}
    >
      {children}
    </a>
  );
}
