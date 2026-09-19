"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  configured: boolean;
};

export function LoginForm({ configured }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!configured) {
    return (
      <div className="panel p-6 md:p-8">
        <p className="eyebrow text-accent">Setup required</p>
        <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
          CMS passcode not set
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-text md:text-base">
          Add <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">CMS_PASSCODE</code>{" "}
          to Vercel environment variables (and local{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">.env.local</code>
          ), then redeploy. See <code className="rounded bg-surface-soft px-1.5 py-0.5 text-sm">docs/CMS.md</code>.
        </p>
      </div>
    );
  }

  return (
    <form
      className="panel p-6 md:p-8"
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
      <p className="eyebrow text-accent">Fernandes Journeys</p>
      <h1 className="font-display mt-2 text-2xl font-bold text-heading md:text-3xl">
        CMS login
      </h1>
      <p className="mt-3 text-sm text-muted">
        Passcode-gated editor for publishing stories to the site.
      </p>

      <label
        htmlFor="cms-passcode"
        className="mt-8 block text-sm font-semibold text-heading"
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

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary btn-block mt-6 disabled:opacity-60"
      >
        {pending ? "Checking…" : "Unlock CMS"}
      </button>
    </form>
  );
}
