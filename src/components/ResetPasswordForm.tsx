"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  token: string | null;
  credentialsConfigured: boolean;
};

export function ResetPasswordForm({
  token,
  credentialsConfigured,
}: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  if (!credentialsConfigured) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Password reset</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          Reset unavailable
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text">
          Password reset isn’t available right now. You can still browse stories
          and try again later.
        </p>
        <Link href="/login" className="btn btn-secondary mt-6">
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Password reset</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          Invalid reset link
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text">
          This reset link is missing or malformed. Request a new link from the
          forgot password page.
        </p>
        <Link href="/forgot-password" className="btn btn-primary mt-6">
          Forgot password
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
        setPending(false);
        return;
      }
      setSuccess(true);
      setPending(false);
      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1500);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <div className="panel p-6 md:p-8">
      <p className="eyebrow text-accent">Alex Journeys</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
        Set a new password
      </h1>
      <p className="mt-3 text-sm text-muted">
        Choose a new password for your reader account, then sign in.
      </p>

      {success ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium text-heading" role="status">
            Password updated. Redirecting to sign in…
          </p>
          <Link href="/login" className="btn btn-primary btn-block">
            Sign in now
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div>
            <label
              htmlFor="reset-password"
              className="block text-sm font-semibold text-heading"
            >
              New password
            </label>
            <input
              id="reset-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
            <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
          </div>

          <div>
            <label
              htmlFor="reset-confirm"
              className="block text-sm font-semibold text-heading"
            >
              Confirm password
            </label>
            <input
              id="reset-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-block disabled:opacity-60"
          >
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href="/forgot-password"
          className="font-semibold text-accent hover:underline"
        >
          Request a new link
        </Link>
        {" · "}
        <Link href="/login" className="font-semibold text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
