"use client";

import Link from "next/link";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";
import { PremiumDiamond } from "@/components/premium/PremiumDiamond";

type Props = {
  signedIn: boolean;
  /** Page to reopen after sign-in. */
  returnTo: string;
  /** Heading. Defaults to the members-only story copy. */
  title?: string;
  /** One or two sentences under the heading. */
  body?: string;
  /** Sign-in sheet intro for readers who already joined. */
  signInIntro?: string;
  /** Top margin; pages that stack the gate under a list pass "mt-6". */
  className?: string;
};

/**
 * Locked state for a member-only story, guide, download, or deal note. The
 * excerpt stays outside this component. Booking stays outside it too.
 */
export function PremiumGate({
  signedIn,
  returnTo,
  title = "The rest of this story is for members",
  body = "Premium opens member stories, guides you can keep, and the fuller trip planner. Hotels and flights stay bookable either way.",
  signInIntro = "Sign in to open member stories if you already joined.",
  className = "mt-10",
}: Props) {
  const openSignIn = useReaderLoginPrompt();

  return (
    <section className={`panel p-6 sm:p-8 ${className}`} aria-labelledby="premium-gate-title">
      <div className="flex items-center gap-3">
        <PremiumDiamond />
        <p className="eyebrow">Members</p>
      </div>
      <h2
        id="premium-gate-title"
        className="font-display mt-3 text-2xl font-bold text-heading"
      >
        {title}
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text md:text-base">{body}</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link href="/premium" className="btn btn-primary w-full sm:w-auto">
          Become a member
        </Link>
        {signedIn ? (
          <p className="self-center text-sm text-muted">
            You’re signed in. Membership opens the rest.
          </p>
        ) : (
          <button
            type="button"
            className="btn btn-secondary w-full sm:w-auto"
            onClick={() => openSignIn({ returnTo, intro: signInIntro })}
          >
            Sign in
          </button>
        )}
      </div>
    </section>
  );
}
