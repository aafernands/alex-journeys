"use client";

import Image from "next/image";
import Link from "next/link";
import { Gem, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { initials } from "@/components/UserMenu";

/** Same footprint for every phone header control. */
export const HEADER_ICON_BUTTON =
  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Solid orange diamond: the site-wide way into Premium. */
export function PremiumDiamondButton({
  compact = false,
  onNavigate,
}: {
  /** Desktop header: 36px to sit with the other desktop controls. */
  compact?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href="/premium"
      aria-label="Premium membership"
      title="Premium"
      className={`${HEADER_ICON_BUTTON} ${compact ? "!h-9 !w-9" : ""} bg-accent text-on-solid hover:bg-accent-deep`}
      onClick={() => onNavigate?.()}
    >
      <Gem className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"} strokeWidth={2.25} aria-hidden="true" />
    </Link>
  );
}

/**
 * Phone header account control. Signed out it opens the shared sign-in sheet;
 * signed in it shows the small profile photo and goes to the account page.
 */
export function HeaderAccountButton({
  enabled = true,
  onNavigate,
}: {
  enabled?: boolean;
  onNavigate?: () => void;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const openReaderLogin = useReaderLoginPrompt();

  if (!enabled) return null;

  const outlined = `${HEADER_ICON_BUTTON} border border-border-strong text-heading hover:bg-surface-soft`;
  const user = status === "authenticated" ? session?.user : null;

  if (user) {
    return (
      <Link
        href="/account"
        aria-label="Your account"
        className={`${outlined} overflow-hidden`}
        onClick={() => onNavigate?.()}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-[0.6875rem] font-semibold text-heading"
            aria-hidden="true"
          >
            {initials(user.name, user.email)}
          </span>
        )}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label="Sign in"
      aria-haspopup="dialog"
      className={outlined}
      disabled={status === "loading"}
      onClick={() => {
        onNavigate?.();
        let returnTo = pathname || "/";
        if (returnTo === "/login" || returnTo.startsWith("/login?")) returnTo = "/account";
        openReaderLogin({ returnTo });
      }}
    >
      <UserRound className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
