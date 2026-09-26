"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useId, useMemo, useRef, useState, type FormEvent } from "react";
import {
  TurnstileField,
  isTurnstileWidgetEnabled,
  type TurnstileFieldHandle,
} from "@/components/TurnstileField";
import { readerLoginErrorMessage } from "@/lib/reader-login-errors";

type Mode = "signin" | "signup";

export type LoginFooterLink = { href: string; label: string };

type Props = {
  googleConfigured: boolean;
  twitterConfigured: boolean;
  credentialsConfigured: boolean;
  returnTo?: string;
  /** Replaces the default supporting line under the title. */
  intro?: string;
  /** Account page already has a page title, so the form title steps down. */
  titleLevel?: "h1" | "h2";
  /** Quiet text links under the form. Defaults to Browse stories and Home. */
  footerLinks?: LoginFooterLink[];
  onAuthenticated?: () => void;
};

type OauthProvider = "google" | "twitter";

/** Official multicolor Google G. Decorative; the button label names the provider. */
function GoogleMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="18"
      height="18"
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/** X mark; currentColor keeps contrast on light and dark secondary buttons. */
function XMark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      />
    </svg>
  );
}

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  return raw;
}

const titleClass = "reader-login-title font-display mt-2 text-2xl font-bold text-heading md:text-3xl";

function LoginTitle({
  level,
  children,
}: {
  level: "h1" | "h2";
  children: string;
}) {
  if (level === "h2") return <h2 className={titleClass}>{children}</h2>;
  return <h1 className={titleClass}>{children}</h1>;
}

export function ReaderLoginForm({
  googleConfigured,
  twitterConfigured,
  credentialsConfigured,
  returnTo,
  intro,
  titleLevel = "h1",
  footerLinks,
  onAuthenticated,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fieldId = useId();
  const nameId = `${fieldId}-name`;
  const emailId = `${fieldId}-email`;
  const passwordId = `${fieldId}-password`;
  const callbackUrl = useMemo(
    () => safeCallbackUrl(returnTo ?? searchParams.get("callbackUrl")),
    [returnTo, searchParams],
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
  const supportingLine =
    intro ??
    (returningToItinerary
      ? "After you continue, you’ll return to this itinerary. A draft in this browser can be saved to your account."
      : "Keep the stories you love and the trips you’re planning, ready on any device.");
  const links = footerLinks ?? [
    { href: "/blog", label: "Browse stories" },
    { href: "/", label: "Home" },
  ];

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
      <div className="reader-login-panel panel p-6 md:p-8">
        <p className="eyebrow text-accent">Alex Journeys</p>
        <LoginTitle level={titleLevel}>Sign-in isn’t available yet</LoginTitle>
        <p className="mt-4 text-sm leading-relaxed text-text">
          You can still read stories and sketch a trip in this browser. Saving
          them to an account will be back soon.
        </p>
        {footerLinks?.length ? (
          <p className="mt-6 text-center text-sm text-muted">
            {footerLinks.map((link, index) => (
              <span key={`${link.href}-${link.label}`}>
                {index > 0 ? " · " : null}
                <Link href={link.href} className="font-semibold text-accent hover:underline">
                  {link.label}
                </Link>
              </span>
            ))}
          </p>
        ) : (
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link href="/" className="btn btn-secondary">
              Back home
            </Link>
            <Link href="/blog" className="btn btn-secondary">
              Browse stories
            </Link>
          </div>
        )}
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
      onAuthenticated?.();
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="reader-login-panel panel p-6 md:p-8">
      <p className="eyebrow text-accent">Alex Journeys</p>
      <LoginTitle level={titleLevel}>
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </LoginTitle>
      <p className="mt-3 text-sm leading-relaxed text-muted">{supportingLine}</p>

      {error || authError ? (
        <p
          className="mt-4 text-sm font-medium text-red-600 dark:text-red-400"
          role="alert"
        >
          {error || readerLoginErrorMessage(authError)}
        </p>
      ) : null}

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
                htmlFor={nameId}
                className="block text-sm font-semibold text-heading"
              >
                Name
              </label>
              <input
                id={nameId}
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
              htmlFor={emailId}
              className="block text-sm font-semibold text-heading"
            >
              Email
            </label>
            <input
              id={emailId}
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
              htmlFor={passwordId}
              className="block text-sm font-semibold text-heading"
            >
              Password
            </label>
            <input
              id={passwordId}
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
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="login-or bg-white px-3 text-xs font-medium text-text">
              or continue with
            </span>
          </div>
        </div>
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
              className="btn btn-secondary btn-oauth btn-block whitespace-nowrap disabled:opacity-60"
              onClick={() => startOauth("google")}
            >
              <GoogleMark />
              {oauthPending === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
          ) : null}
          {twitterConfigured ? (
            <button
              type="button"
              disabled={pending || oauthPending !== null}
              className="btn btn-secondary btn-oauth btn-block whitespace-nowrap disabled:opacity-60"
              onClick={() => startOauth("twitter")}
            >
              <XMark />
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

      <p className="mt-6 text-center text-sm text-muted">
        {links.map((link, index) => (
          <span key={`${link.href}-${link.label}`}>
            {index > 0 ? " · " : null}
            <Link href={link.href} className="font-semibold text-accent hover:underline">
              {link.label}
            </Link>
          </span>
        ))}
      </p>
    </div>
  );
}
