"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type Props = {
  className?: string;
};

export function NewsletterForm({ className }: Props) {
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
        className="min-h-11 w-full rounded-lg border border-hero-type/15 bg-hero-type/10 px-4 text-sm text-hero-type placeholder:text-hero-type/45 transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
      />
      <label className="flex items-start gap-2.5 text-sm leading-snug text-hero-type/65">
        <input
          type="checkbox"
          required
          disabled={status === "loading" || status === "success"}
          className="mt-1 size-4 shrink-0 rounded border-hero-type/30 accent-accent"
        />
        <span>
          By entering your email, you agree to receive Fernandes Journeys emails
          and agree to our{" "}
          <Link
            href="/policies"
            className="text-hero-type underline underline-offset-2 hover:text-accent"
          >
            Terms and Conditions
          </Link>{" "}
          and{" "}
          <Link
            href="/policies"
            className="text-hero-type underline underline-offset-2 hover:text-accent"
          >
            Privacy Policy
          </Link>
          .
        </span>
      </label>
      <button
        type="submit"
        disabled={status === "loading" || status === "success"}
        className="btn btn-primary btn-block sm:w-auto disabled:opacity-60"
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
            status === "error" ? "text-red-300" : "text-accent"
          }`}
          role={status === "error" ? "alert" : "status"}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
