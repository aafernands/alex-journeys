"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { VerifyEmailForm } from "@/components/VerifyEmailForm";

type Props = {
  link: { uid: string; token: string } | null;
  signedIn: boolean;
  email: string | null;
  verified: boolean;
  next: string;
};

export function VerifyEmailClient({ link, signedIn, email, verified, next }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    link ? "loading" : verified ? "done" : "idle",
  );
  const [message, setMessage] = useState<string>(
    link ? "Confirming your email…" : verified ? "Your email is confirmed." : "",
  );
  const [addedPassword, setAddedPassword] = useState(false);

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(link),
        });
        const data = (await res.json()) as { error?: string; message?: string; purpose?: string };
        if (cancelled) return;
        if (!res.ok) {
          setState("error");
          setMessage(data.error || "This link is no longer valid.");
          return;
        }
        setAddedPassword(data.purpose === "add-password");
        setState("done");
        setMessage(data.message || "Thanks! Your email is confirmed.");
        try {
          await update({});
        } catch {
          /* best effort */
        }
        router.refresh();
      } catch {
        if (!cancelled) {
          setState("error");
          setMessage("Network error. Try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Run once for this link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link?.uid, link?.token]);

  return (
    <div className="panel p-6 md:p-8">
      <p className="eyebrow text-accent">Alex Journeys</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
        {state === "done" ? "You’re all set" : "Confirm your email"}
      </h1>

      {state === "loading" || state === "done" || state === "error" ? (
        <p
          className={`mt-4 text-sm leading-relaxed ${state === "error" ? "font-medium text-red-600 dark:text-red-400" : "text-text"}`}
          role={state === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}

      {state === "done" ? (
        <Link
          href={addedPassword && !signedIn ? "/login" : next}
          className="btn btn-primary mt-6"
        >
          {addedPassword && !signedIn ? "Sign in" : "Continue"}
        </Link>
      ) : null}

      {(state === "idle" || state === "error") && signedIn && email ? (
        <>
          <VerifyEmailForm
            email={email}
            onVerified={() => {
              setState("done");
              setMessage("Thanks! Your email is confirmed.");
              router.refresh();
            }}
          />
          <p className="mt-6 text-sm text-muted">
            <Link href={next} className="font-semibold text-accent hover:text-accent-deep">
              Skip for now
            </Link>{" "}
            — you can confirm later from your account page.
          </p>
        </>
      ) : null}

      {(state === "idle" || state === "error") && !signedIn ? (
        <p className="mt-6 text-sm leading-relaxed text-text">
          <Link href={`/login?callbackUrl=${encodeURIComponent("/verify-email")}`} className="font-semibold text-accent hover:text-accent-deep">
            Sign in
          </Link>{" "}
          to get a new code.
        </p>
      ) : null}
    </div>
  );
}
