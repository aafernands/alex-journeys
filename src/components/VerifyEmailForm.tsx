"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Props = {
  email: string;
  /** Called after the code is accepted. Defaults to refreshing the page. */
  onVerified?: () => void;
  /** Compact layout for the account page. */
  compact?: boolean;
};

/** 6-digit code entry plus "Send a new code". Signed-in readers only. */
export function VerifyEmailForm({ email, onVerified, compact }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    try {
      const res = await fetch("/api/auth/verify-email/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "We couldn’t confirm your email. Try again.");
        setPending(false);
        return;
      }
      setInfo(data.message || "Thanks! Your email is confirmed.");
      try {
        await update({});
      } catch {
        /* best effort */
      }
      if (onVerified) onVerified();
      else router.refresh();
    } catch {
      setError("Network error. Try again.");
    }
    setPending(false);
  }

  async function resend() {
    setError(null);
    setInfo(null);
    setSending(true);
    try {
      const res = await fetch("/api/auth/verify-email/send", { method: "POST" });
      const data = (await res.json()) as { error?: string; message?: string; verified?: boolean };
      if (!res.ok) setError(data.error || "We couldn’t send the email. Try again soon.");
      else {
        setInfo(data.message || "We sent you a new code.");
        if (data.verified) router.refresh();
      }
    } catch {
      setError("Network error. Try again.");
    }
    setSending(false);
  }

  return (
    <form className={compact ? "mt-3 space-y-3" : "mt-6 space-y-4"} onSubmit={onSubmit}>
      <p className="text-sm leading-relaxed text-text">
        We sent a 6-digit code to <strong className="text-heading">{email}</strong>. Enter it
        below, or tap the button in that email.
      </p>
      <div>
        <label htmlFor="verify-code" className="block text-sm font-semibold text-heading">
          Code
        </label>
        <input
          id="verify-code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]*"
          maxLength={7}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ""))}
          className="mt-2 min-h-11 w-full max-w-xs rounded-lg border border-border bg-white px-4 text-lg tracking-[0.3em] text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      {error ? (
        <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="text-sm text-text" role="status">
          {info}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || code.replace(/\s/g, "").length !== 6}
          className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Checking…" : "Confirm email"}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="btn btn-secondary disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send a new code"}
        </button>
      </div>
    </form>
  );
}
