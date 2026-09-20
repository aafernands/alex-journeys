"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import {
  TurnstileField,
  isTurnstileWidgetEnabled,
  type TurnstileFieldHandle,
} from "@/components/TurnstileField";

type Props = {
  credentialsConfigured: boolean;
};

export function ForgotPasswordForm({ credentialsConfigured }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const widgetEnabled = isTurnstileWidgetEnabled();

  if (!credentialsConfigured) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Password reset</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          Reset unavailable
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text">
          Email/password accounts are not configured on this deployment.
        </p>
        <Link href="/login" className="btn btn-secondary mt-6">
          Back to sign in
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (widgetEnabled && !turnstileToken) {
      setError("Please complete the security check before submitting.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        code?: string;
      };
      if (!res.ok) {
        setError(data.error || "Could not send reset email.");
        setPending(false);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
        return;
      }
      setSuccess(
        data.message ||
          "If an account with that email exists and can reset a password, you will receive a reset link shortly.",
      );
      setPending(false);
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  }

  return (
    <div className="panel p-6 md:p-8">
      <p className="eyebrow text-accent">Fernandes Journeys</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
        Forgot password
      </h1>
      <p className="mt-3 text-sm text-muted">
        Enter the email for your reader account. We&apos;ll send a time-limited
        reset link if that account has a password.
      </p>

      {success ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium text-heading" role="status">
            {success}
          </p>
          <Link href="/login" className="btn btn-primary btn-block">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-sm font-semibold text-heading"
            >
              Email
            </label>
            <input
              id="forgot-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>

          <TurnstileField
            ref={turnstileRef}
            onToken={setTurnstileToken}
          />

          <button
            type="submit"
            disabled={pending || (widgetEnabled && !turnstileToken)}
            className="btn btn-primary btn-block disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale"
          >
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Back to sign in
        </Link>
        {" · "}
        <Link href="/" className="font-semibold text-accent hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
