"use client";

import Link from "next/link";
import { useReaderLoginPrompt } from "@/components/ReaderLoginPrompt";

type Props = {
  signedIn: boolean;
  /** Page to reopen after sign-in. */
  returnTo: string;
};

/**
 * Locked state for a member-only story or guide. The excerpt stays outside
 * this component. Booking stays outside it too.
 */
export function PremiumGate({ signedIn, returnTo }: Props) {
  const openSignIn = useReaderLoginPrompt();

  return (
    <section className="panel mt-10 p-6 sm:p-8" aria-labelledby="premium-gate-title">
      <p className="eyebrow">Members</p>
      <h2
        id="premium-gate-title"
        className="font-display mt-2 text-2xl font-bold text-heading"
      >
        The rest of this story is for members
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-text md:text-base">
        Premium opens member stories, guides you can keep, and the fuller trip
        planner. Hotels and flights stay bookable either way.
      </p>
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
            onClick={() =>
              openSignIn({
                returnTo,
                intro: "Sign in to open member stories if you already joined.",
              })
            }
          >
            Sign in
          </button>
        )}
      </div>
    </section>
  );
}
