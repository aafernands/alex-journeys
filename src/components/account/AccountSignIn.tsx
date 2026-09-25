"use client";

import { ReaderLoginForm } from "@/components/ReaderLoginForm";
import {
  accountReturnPath,
  accountSectionFromLocation,
} from "@/lib/account-section";
import { planATripHref } from "@/lib/trip-record";

type Props = {
  googleConfigured: boolean;
  twitterConfigured: boolean;
  credentialsConfigured: boolean;
};

/**
 * Logged-out account page. Same sign-in form as the sheet, inline.
 * A visit to /account#saved or /account#trips returns to that section.
 */
export function AccountSignIn({
  googleConfigured,
  twitterConfigured,
  credentialsConfigured,
}: Props) {
  const returnTo =
    typeof window === "undefined"
      ? "/account"
      : accountReturnPath(
          accountSectionFromLocation(window.location.hash, window.location.search),
        );

  return (
    <ReaderLoginForm
      googleConfigured={googleConfigured}
      twitterConfigured={twitterConfigured}
      credentialsConfigured={credentialsConfigured}
      returnTo={returnTo}
      titleLevel="h2"
      footerLinks={[
        { href: planATripHref(), label: "Plan a trip" },
        { href: "/blog", label: "Browse stories" },
      ]}
    />
  );
}
