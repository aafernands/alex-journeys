"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  TurnstileField,
  isTurnstileWidgetEnabled,
  type TurnstileFieldHandle,
} from "@/components/TurnstileField";

type Mode = "signin" | "signup";

type Props = {
  googleConfigured: boolean;
  twitterConfigured: boolean;
  credentialsConfigured: boolean;
};

type OauthProvider = "google" | "twitter";

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

export function ReaderLoginForm({
  googleConfigured,
  twitterConfigured,
  credentialsConfigured,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => safeCallbackUrl(searchParams.get("callbackUrl")),
    [searchParams],
  );
  const returningToItinerary = callbackUrl.startsWith("/guides/plan-a-trip");
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>(
    searchParams.get("mode") === "signup" ? "signup" : "signin",
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [oauthPending, setOauthPending] = useState<OauthProvider | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const widgetEnabled = isTurnstileWidgetEnabled();

  const anyAuth =
    googleConfigured || twitterConfigured || credentialsConfigured;
  const oauthConfigured = googleConfigured || twitterConfigured;

  async function startOauth(provider: OauthProvider) {
    setError(null);
    setOauthPending(provider);
    try {
      await signIn(provider, { callbackUrl });
    } catch {
      setError(
        provider === "twitter"
          ? "X sign-in failed. Try again."
          : "Google sign-in failed. Try again.",
      );
      setOauthPending(null);
    }
  }

  if (!anyAuth) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Fernandes Journeys</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          Sign-in isn’t available yet
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text">
          You can still read stories and sketch a trip in this browser. Saving
          them to an account will be back soon.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link href="/" className="btn btn-secondary">
            Back home
          </Link>
          <Link href="/blog" className="btn btn-secondary">
            Browse stories
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!credentialsConfigured) return;
    setError(null);

    // Require Turnstile on signup when the widget is configured.
    if (mode === "signup" && widgetEnabled && !turnstileToken) {
      setError("Please complete the security check before submitting.");
      return;
    }

    setPending(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            password,
            ...(turnstileToken ? { turnstileToken } : {}),
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error || "Could not create account.");
          setPending(false);
          turnstileRef.current?.reset();
          setTurnstileToken(null);
          return;
        }

        // Registration consumed the Turnstile token. Require a fresh challenge
        // if the follow-up credentials sign-in needs to be retried.
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError(
          mode === "signup"
            ? "Account created, but sign-in failed. Try signing in."
            : "Invalid email or password.",
        );
        setPending(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="panel p-6 md:p-8">
      <p className="eyebrow text-accent">Fernandes Journeys</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        {returningToItinerary
          ? "After you continue, you’ll return to this itinerary. A draft in this browser can be saved to your account."
          : "Keep the stories you love and the trips you’re planning, ready on any device."}
      </p>

      {credentialsConfigured ? (
        <div className="mt-6 flex rounded-lg border border-border bg-surface-soft p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "signin"
                ? "bg-white text-heading shadow-sm ring-1 ring-border"
                : "text-muted hover:text-heading"
            }`}
            onClick={() => {
              setMode("signin");
              setError(null);
              turnstileRef.current?.reset();
              setTurnstileToken(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-white text-heading shadow-sm ring-1 ring-border"
                : "text-muted hover:text-heading"
            }`}
            onClick={() => {
              setMode("signup");
              setError(null);
              turnstileRef.current?.reset();
              setTurnstileToken(null);
            }}
          >
            Create account
          </button>
        </div>
      ) : null}

      {credentialsConfigured ? (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          {mode === "signup" ? (
            <div>
              <label
                htmlFor="login-name"
                className="block text-sm font-semibold text-heading"
              >
                Name
              </label>
              <input
                id="login-name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
          ) : null}

          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-semibold text-heading"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-semibold text-heading"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            {mode === "signup" ? (
              <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
            ) : (
              <p className="mt-1.5 text-right text-xs">
                <Link
                  href="/forgot-password"
                  className="font-semibold text-accent hover:underline"
                >
                  Forgot password?
                </Link>
              </p>
            )}
          </div>

          {mode === "signup" ? (
            <TurnstileField
              ref={turnstileRef}
              onToken={setTurnstileToken}
            />
          ) : null}

          <button
            type="submit"
            disabled={
              pending ||
              oauthPending !== null ||
              (mode === "signup" && widgetEnabled && !turnstileToken)
            }
            className="btn btn-primary btn-block disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale"
          >
            {pending
              ? mode === "signup"
                ? "Creating account…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      ) : null}

      {oauthConfigured && credentialsConfigured ? (
        <p className="my-6 text-center text-xs font-semibold uppercase tracking-wide text-muted">
          Or
        </p>
      ) : oauthConfigured ? (
        <div className="mt-6" />
      ) : null}

      {oauthConfigured ? (
        <div
          className={
            googleConfigured && twitterConfigured
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
              : "flex flex-col gap-3"
          }
        >
          {googleConfigured ? (
            <button
              type="button"
              disabled={pending || oauthPending !== null}
              className="btn btn-secondary btn-block whitespace-nowrap px-3 text-sm disabled:opacity-60"
              onClick={() => startOauth("google")}
            >
              {oauthPending === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
          ) : null}
          {twitterConfigured ? (
            <button
              type="button"
              disabled={pending || oauthPending !== null}
              className="btn btn-secondary btn-block whitespace-nowrap px-3 text-sm disabled:opacity-60"
              onClick={() => startOauth("twitter")}
            >
              {oauthPending === "twitter" ? "Redirecting…" : "Continue with X"}
            </button>
          ) : null}
        </div>
      ) : null}

      <p className="mt-5 text-center text-xs leading-relaxed text-muted">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="font-semibold text-link hover:text-accent">
          Terms
        </Link>{" "}and{" "}
        <Link href="/privacy" className="font-semibold text-link hover:text-accent">
          Privacy Policy
        </Link>
        .
      </p>

      {error || authError ? (
        <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error ||
            (authError === "AccessDenied"
              ? "Sign-in was denied. Your account may be disabled."
              : "Sign-in failed. Try again.")}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/blog" className="font-semibold text-accent hover:underline">
          Browse stories
        </Link>
        {" · "}
        <Link href="/" className="font-semibold text-accent hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
