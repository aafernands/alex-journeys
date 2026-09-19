"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Props = {
  className?: string;
  variant?: "dark" | "journal";
};

export function NewsletterForm({ className, variant = "dark" }: Props) {
  const journal = variant === "journal";
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(data.message || "You're subscribed — thank you!");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Check your connection and try again.");
    }
  }

  return (
    <form
      className={className ?? "mt-8 max-w-md space-y-3"}
      onSubmit={onSubmit}
      aria-label="Newsletter signup"
    >
      <label htmlFor="footer-email" className="sr-only">
        Email address
      </label>
      <input
        id="footer-email"
        name="email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        autoComplete="email"
        disabled={status === "loading" || status === "success"}
        className={
          journal
            ? "min-h-11 w-full rounded-sm border border-border bg-surface-soft px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
            : "min-h-11 w-full rounded-lg border border-white/15 bg-white/10 px-4 text-sm text-white placeholder:text-white/45 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
        }
      />
      <label
        className={`flex items-start gap-2.5 text-sm leading-snug ${journal ? "text-text/75" : "text-white/65"}`}
      >
        <input
          type="checkbox"
          required
          disabled={status === "loading" || status === "success"}
          className="mt-1 size-4 shrink-0 rounded border-white/30 accent-accent"
        />
        <span>
          By entering your email, you agree to receive Fernandes Journeys emails
          and agree to our{" "}
          <Link
            href="/policies"
            className={
              journal
                ? "text-link underline underline-offset-2 hover:text-accent-deep"
                : "text-white underline underline-offset-2 hover:text-accent"
            }
          >
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/policies"
            className={
              journal
                ? "text-link underline underline-offset-2 hover:text-accent-deep"
                : "text-white underline underline-offset-2 hover:text-accent"
            }
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <button
        type="submit"
        disabled={status === "loading" || status === "success"}
        className="btn btn-ink btn-block sm:w-auto disabled:opacity-60"
      >
        {status === "loading"
          ? "Subscribing…"
          : status === "success"
            ? "Subscribed"
            : "Subscribe"}
      </button>
      {message ? (
        <p
          className={`text-sm ${
            status === "error"
              ? journal
                ? "text-red-700"
                : "text-red-300"
              : journal
                ? "text-accent-deep"
                : "text-accent"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
