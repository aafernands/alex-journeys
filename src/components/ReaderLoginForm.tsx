"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

type Mode = "signin" | "signup";

type Props = {
  googleConfigured: boolean;
  credentialsConfigured: boolean;
};

function safeCallbackUrl(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/account";
  // Keep admins who somehow land here able to return to CMS after OAuth.
  return raw;
}

export function ReaderLoginForm({
  googleConfigured,
  credentialsConfigured,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = useMemo(
    () => safeCallbackUrl(searchParams.get("callbackUrl")),
    [searchParams],
  );
  const authError = searchParams.get("error");

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [oauthPending, setOauthPending] = useState(false);

  const anyAuth = googleConfigured || credentialsConfigured;

  if (!anyAuth) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Sign in</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          Sign-in unavailable
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text">
          Reader authentication is not configured on this deployment. Ask the
          site owner to set Google OAuth and/or Firebase +{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            AUTH_SECRET
          </code>
          .
        </p>
        <Link href="/" className="btn btn-secondary mt-6">
          Back home
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!credentialsConfigured) return;
    setError(null);
    setPending(true);
    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error || "Could not create account.");
          setPending(false);
          return;
        }
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
      <p className="mt-3 text-sm text-muted">
        Save stories across devices. Reader accounts never unlock the CMS.
      </p>

      {credentialsConfigured ? (
        <div className="mt-6 flex rounded-lg border border-border bg-surface-soft p-1">
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "signin"
                ? "bg-white text-heading shadow-sm"
                : "text-muted hover:text-heading"
            }`}
            onClick={() => {
              setMode("signin");
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
              mode === "signup"
                ? "bg-white text-heading shadow-sm"
                : "text-muted hover:text-heading"
            }`}
            onClick={() => {
              setMode("signup");
              setError(null);
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
            ) : null}
          </div>

          <button
            type="submit"
            disabled={pending || oauthPending}
            className="btn btn-primary btn-block disabled:opacity-60"
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

      {googleConfigured && credentialsConfigured ? (
        <p className="my-6 text-center text-xs font-semibold uppercase tracking-wide text-muted">
          Or
        </p>
      ) : googleConfigured ? (
        <div className="mt-6" />
      ) : null}

      {googleConfigured ? (
        <button
          type="button"
          disabled={pending || oauthPending}
          className="btn btn-secondary btn-block disabled:opacity-60"
          onClick={async () => {
            setError(null);
            setOauthPending(true);
            try {
              await signIn("google", { callbackUrl });
            } catch {
              setError("Google sign-in failed. Try again.");
              setOauthPending(false);
            }
          }}
        >
          {oauthPending ? "Redirecting…" : "Continue with Google"}
        </button>
      ) : null}

      {error || authError ? (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error ||
            (authError === "AccessDenied"
              ? "Sign-in was denied. Your account may be disabled."
              : "Sign-in failed. Try again.")}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/account" className="font-semibold text-accent hover:underline">
          Account dashboard
        </Link>
        {" · "}
        <Link href="/" className="font-semibold text-accent hover:underline">
          Home
        </Link>
      </p>
    </div>
  );
}
