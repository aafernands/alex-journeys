"use client";

import Link from "next/link";
import { LogIn } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useMemo } from "react";
import { UserMenu } from "@/components/UserMenu";

type Props = {
  /**
   * `header` — desktop bar. `header-mobile` — labeled control beside the menu.
   * `drawer-cta` — full-width Sign in in the mobile menu.
   * `drawer` / `mobile` — older strips; signed-in state still uses UserMenu.
   */
  variant?: "header" | "header-mobile" | "mobile" | "drawer" | "drawer-cta";
  onNavigate?: () => void;
  /**
   * When false, hide the control (no reader auth configured).
   * Prop name kept for Header compatibility; means "reader auth available"
   * (email/password and/or Google), not Google alone.
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
  const isDrawerCta = variant === "drawer-cta";
  const isDrawer = variant === "drawer" || isDrawerCta;
  const isHeaderMobile = variant === "header-mobile";
  const isMobile = variant === "mobile";

  if (loading) {
    if (isDrawerCta) {
      return (
        <div className="space-y-2" aria-hidden="true">
          <div className="h-11 w-full rounded-lg bg-surface" />
          <div className="mx-auto h-4 w-52 max-w-full rounded bg-surface" />
        </div>
      );
    }
    if (isDrawer) {
      return (
        <div className="h-11 w-full rounded-xl bg-surface" aria-hidden="true" />
      );
    }
    if (isHeaderMobile) {
      return (
        <span
          className="inline-flex h-11 min-w-[6.25rem] rounded-full bg-surface"
          aria-hidden="true"
        />
      );
    }
    return (
      <span
        className={
          isMobile
            ? "inline-flex h-11 w-11 items-center justify-center text-sm text-muted"
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

  if (isDrawerCta) {
    return (
      <div className="flex flex-col gap-2">
        <Link
          href={loginHref}
          className="btn btn-primary btn-block"
          onClick={() => onNavigate?.()}
        >
          Sign in / Create account
        </Link>
        <p className="text-center text-sm leading-snug text-text">
          Save stories and trip plans on any device.
        </p>
      </div>
    );
  }

  if (isDrawer) {
    return (
      <Link
        href={loginHref}
        className="btn btn-primary btn-block"
        onClick={() => onNavigate?.()}
      >
        Sign in
      </Link>
    );
  }

  if (isHeaderMobile) {
    return (
      <Link
        href={loginHref}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-3 font-sans text-sm font-semibold text-on-solid transition hover:bg-accent-deep"
        onClick={() => onNavigate?.()}
      >
        <LogIn
          className="h-4 w-4 shrink-0"
          strokeWidth={2.25}
          aria-hidden="true"
        />
        Sign in
      </Link>
    );
  }

  const buttonClass = isMobile
    ? "flex min-h-11 w-full items-center gap-2.5 py-2.5 text-left text-base font-semibold tracking-tight text-heading hover:text-accent disabled:opacity-60"
    : "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-sans text-sm font-semibold tracking-tight text-text transition hover:bg-surface-soft hover:text-heading disabled:opacity-60";

  return (
    <Link href={loginHref} className={buttonClass} onClick={() => onNavigate?.()}>
      Sign in
    </Link>
  );
}
