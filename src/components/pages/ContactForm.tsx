"use client";

import { useRef, useState } from "react";
import { site } from "@/data/content";
import {
  TurnstileField,
  isTurnstileWidgetEnabled,
  type TurnstileFieldHandle,
} from "@/components/TurnstileField";

export type ContactFormLabels = {
  firstNameLabel?: string;
  lastNameLabel?: string;
  emailLabel?: string;
  messageLabel?: string;
  submitLabel?: string;
  successCopy?: string;
  directEmailHint?: string;
};

type Props = {
  labels?: ContactFormLabels;
};

export function ContactForm({ labels }: Props) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const widgetEnabled = isTurnstileWidgetEnabled();

  const firstNameLabel = labels?.firstNameLabel || "First name";
  const lastNameLabel = labels?.lastNameLabel || "Last name";
  const emailLabel = labels?.emailLabel || "Email";
  const messageLabel = labels?.messageLabel || "Message";
  const submitLabel = labels?.submitLabel || "Send message";
  const successCopy =
    labels?.successCopy || `Opening your email app to send to ${site.email}…`;
  const directEmailHint =
    labels?.directEmailHint || "Or email me directly at";

  return (
    <form
      className="mt-10 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);

        if (widgetEnabled && !turnstileToken) {
          setError("Please complete the security check before submitting.");
          return;
        }

        const fd = new FormData(e.currentTarget);
        const first = String(fd.get("first") || "").trim();
        const last = String(fd.get("last") || "").trim();
        const email = String(fd.get("email") || "").trim();
        const message = String(fd.get("message") || "").trim();
        const subject = encodeURIComponent(
          `Fernandes Journeys contact from ${first}${last ? ` ${last}` : ""}`,
        );
        const body = encodeURIComponent(
          `${message}\n\n—\nFrom: ${first} ${last}\nEmail: ${email}`,
        );
        window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
        setSent(true);
        turnstileRef.current?.reset();
        setTurnstileToken(null);
      }}
      aria-label="Contact form"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-first" className="text-sm font-semibold text-heading">
            {firstNameLabel} <span className="text-accent">*</span>
          </label>
          <input
            id="contact-first"
            name="first"
            type="text"
            required
            autoComplete="given-name"
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>
        <div>
          <label htmlFor="contact-last" className="text-sm font-semibold text-heading">
            {lastNameLabel}
          </label>
          <input
            id="contact-last"
            name="last"
            type="text"
            autoComplete="family-name"
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-email" className="text-sm font-semibold text-heading">
          {emailLabel} <span className="text-accent">*</span>
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="text-sm font-semibold text-heading">
          {messageLabel} <span className="text-accent">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      <TurnstileField
        ref={turnstileRef}
        onToken={setTurnstileToken}
      />
      <button
        type="submit"
        disabled={widgetEnabled && !turnstileToken}
        className="btn btn-primary btn-block sm:w-auto disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale"
      >
        {submitLabel}
      </button>
      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {sent ? (
        <p className="text-sm text-text" role="status">
          {successCopy.includes(site.email)
            ? successCopy
            : `${successCopy} ${site.email}`}
        </p>
      ) : (
        <p className="text-sm text-muted">
          {directEmailHint}{" "}
          <a href={`mailto:${site.email}`} className="text-link hover:text-accent">
            {site.email}
          </a>
          .
        </p>
      )}
    </form>
  );
}
