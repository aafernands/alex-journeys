"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { UserMenu } from "@/components/UserMenu";

type Props = {
  /** Compact styling for the sticky header; drawer = full account strip. */
  variant?: "header" | "mobile" | "drawer";
  onNavigate?: () => void;
  /**
   * When false, hide the control (no reader auth configured).
   * Prop name kept for Header compatibility; means "reader auth available".
   */
  googleConfigured?: boolean;
  /** Override sign-in return URL (path). Default: current path. */
  callbackUrl?: string;
};

/**
 * Public reader auth: link to /login, or avatar UserMenu when signed in.
 * Admin console appears in the menu only when session.user.isAdmin.
 */
export function ReaderAuthButtons({
  variant = "header",
  onNavigate,
  googleConfigured = true,
  callbackUrl,
}: Props) {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const loginHref = useMemo(() => {
    let path = callbackUrl || pathname || "/account";
    if (!path.startsWith("/") || path.startsWith("//")) path = "/account";
    // Avoid bouncing login → login
    if (path === "/login" || path.startsWith("/login?")) path = "/account";
    return `/login?callbackUrl=${encodeURIComponent(path)}`;
  }, [callbackUrl, pathname]);

  if (!googleConfigured) {
    return null;
  }

  const signedIn = status === "authenticated" && Boolean(session?.user);
  const loading = status === "loading";
  const isDrawer = variant === "drawer";
  const isMobile = variant === "mobile";

  if (loading) {
    if (isDrawer) {
      return (
        <div className="h-5 w-16 rounded bg-surface-soft" aria-hidden="true" />
      );
    }
    return (
      <span
        className={
          isMobile
            ? "inline-flex h-9 w-9 items-center justify-center text-sm text-muted"
            : "px-2 text-sm text-muted"
        }
        aria-hidden="true"
      >
        …
      </span>
    );
  }

  if (signedIn) {
    return <UserMenu variant={variant} onNavigate={onNavigate} />;
  }

  if (isDrawer) {
    return (
      <Link
        href={loginHref}
        className="inline-flex items-center py-1 text-sm font-semibold text-muted transition hover:text-accent"
        onClick={() => onNavigate?.()}
      >
        Sign in
      </Link>
    );
  }

  const buttonClass = isMobile
    ? "flex w-full items-center gap-2.5 py-2.5 text-left text-base font-semibold tracking-tight text-heading hover:text-accent disabled:opacity-60"
    : "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-semibold tracking-tight text-text transition hover:bg-surface-soft hover:text-heading disabled:opacity-60";

  return (
    <Link href={loginHref} className={buttonClass} onClick={() => onNavigate?.()}>
      Sign in
    </Link>
  );
}
