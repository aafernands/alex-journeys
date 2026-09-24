"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  passcodeConfigured: boolean;
  googleConfigured: boolean;
  githubConfigured: boolean;
};

export function LoginForm({
  passcodeConfigured,
  googleConfigured,
  githubConfigured,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [oauthPending, setOauthPending] = useState<"google" | "github" | null>(
    null,
  );

  const oauthAvailable = googleConfigured || githubConfigured;
  const anyAuth = passcodeConfigured || oauthAvailable;

  if (!anyAuth) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Setup required</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          CMS auth not configured
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text md:text-base">
          Add OAuth (
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">
            AUTH_SECRET
          </code>
          , provider IDs, and{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">
            CMS_ADMIN_EMAILS
          </code>
          ) and/or{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">
            CMS_PASSCODE
          </code>{" "}
          to Vercel environment variables (and local{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">
            .env.local
          </code>
          ), then redeploy. See{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">
            docs/CMS.md
          </code>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="panel p-6 md:p-8">
      <p className="eyebrow text-accent">Alex Journeys</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
        CMS login
      </h1>
      <p className="mt-3 text-sm text-muted">
        Sign in with an allowlisted admin account to publish stories.
      </p>

      {oauthAvailable ? (
        <div className="mt-8 flex flex-col gap-3">
          {googleConfigured ? (
            <button
              type="button"
              disabled={oauthPending !== null || pending}
              className="btn btn-primary btn-block disabled:opacity-60"
              onClick={async () => {
                setError(null);
                setOauthPending("google");
                try {
                  await signIn("google", { callbackUrl: "/cms" });
                } catch {
                  setError("Google sign-in failed. Try again.");
                  setOauthPending(null);
                }
              }}
            >
              {oauthPending === "google"
                ? "Redirecting…"
                : "Continue with Google"}
            </button>
          ) : null}
          {githubConfigured ? (
            <button
              type="button"
              disabled={oauthPending !== null || pending}
              className="btn btn-secondary btn-block disabled:opacity-60"
              onClick={async () => {
                setError(null);
                setOauthPending("github");
                try {
                  await signIn("github", { callbackUrl: "/cms" });
                } catch {
                  setError("GitHub sign-in failed. Try again.");
                  setOauthPending(null);
                }
              }}
            >
              {oauthPending === "github"
                ? "Redirecting…"
                : "Continue with GitHub"}
            </button>
          ) : null}
        </div>
      ) : null}

      {passcodeConfigured ? (
        <form
          className={oauthAvailable ? "mt-8 border-t border-border pt-8" : "mt-8"}
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setPending(true);
            const fd = new FormData(e.currentTarget);
            const passcode = String(fd.get("passcode") || "");
            try {
              const res = await fetch("/api/cms/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ passcode }),
              });
              const data = (await res.json()) as { error?: string };
              if (!res.ok) {
                setError(data.error || "Login failed.");
                setPending(false);
                return;
              }
              router.refresh();
            } catch {
              setError("Network error. Try again.");
              setPending(false);
            }
          }}
        >
          {oauthAvailable ? (
            <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-muted">
              Or use passcode
            </p>
          ) : null}

          <label
            htmlFor="cms-passcode"
            className="block text-sm font-semibold text-heading"
          >
            Passcode
          </label>
          <input
            id="cms-passcode"
            name="passcode"
            type="password"
            required
            autoComplete="current-password"
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />

          <button
            type="submit"
            disabled={pending || oauthPending !== null}
            className="btn btn-primary btn-block mt-6 disabled:opacity-60"
          >
            {pending ? "Checking…" : "Unlock CMS"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
