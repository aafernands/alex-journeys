"use client";

import { MailCheck } from "lucide-react";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

/** Shown on /account until the reader confirms their email. */
export function VerifyEmailPanel({
  email,
  pendingPremium,
}: {
  email: string;
  pendingPremium: boolean;
}) {
  return (
    <section
      className="panel border-accent/40 p-4"
      aria-labelledby="verify-email-title"
      id="verify-email"
    >
      <h2
        id="verify-email-title"
        className="flex items-center gap-2 font-display text-ds-title font-bold text-heading"
      >
        <MailCheck className="h-5 w-5 text-accent" aria-hidden="true" />
        Confirm your email
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text">
        {pendingPremium
          ? "A Premium membership is waiting for this email. Confirm it’s yours to switch it on."
          : "Please confirm your email so we know this account is really yours. It keeps your account safe and makes sure any Premium membership bought with this email reaches you."}
      </p>
      <VerifyEmailForm email={email} compact />
    </section>
  );
}
