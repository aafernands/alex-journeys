"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRef, useState, type FormEvent } from "react";
import { site } from "@/data/content";
import {
  TurnstileField,
  isTurnstileWidgetEnabled,
  type TurnstileFieldHandle,
} from "@/components/TurnstileField";
import { SUPPORT_TOPICS } from "@/lib/support-tickets";

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
  /** Spacing above the form. Defaults to the hub-page gap. */
  className?: string;
};

const inputClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

/**
 * Help & Contact form. Sends a support request (guest or signed in); the
 * reader gets an email with a reference number and we reply by email.
 * If requests can't be saved right now it falls back to opening the
 * reader's email app, as before.
 */
export function ContactForm({ labels, className = "hub-follow" }: Props) {
  const { data: session } = useSession();
  const signedInEmail = session?.user?.email ?? "";
  const signedInName = session?.user?.name ?? "";
  const [done, setDone] = useState<{ ticketNumber: string | null; first: string; email: string } | null>(null);
  const [mailtoSent, setMailtoSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileFieldHandle>(null);
  const widgetEnabled = isTurnstileWidgetEnabled();

  const firstNameLabel = labels?.firstNameLabel || "First name";
  const lastNameLabel = labels?.lastNameLabel || "Last name";
  const emailLabel = labels?.emailLabel || "Email";
  const messageLabel = labels?.messageLabel || "Message";
  const submitLabel = labels?.submitLabel || "Send message";
  const directEmailHint = labels?.directEmailHint || "Or email me directly at";
  const [defaultFirst, ...restName] = signedInName.trim().split(/\s+/);

  function openMailto(first: string, last: string, email: string, subject: string, message: string) {
    const mailSubject = encodeURIComponent(subject || `Alex Journeys contact from ${first}${last ? ` ${last}` : ""}`);
    const body = encodeURIComponent(`${message}\n\n—\nFrom: ${first} ${last}\nEmail: ${email}`);
    window.location.href = `mailto:${site.email}?subject=${mailSubject}&body=${body}`;
    setMailtoSent(true);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (widgetEnabled && !turnstileToken) {
      setError("Please complete the security check before submitting.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    const first = String(fd.get("first") || "").trim();
    const last = String(fd.get("last") || "").trim();
    const email = String(fd.get("email") || signedInEmail).trim();
    const topic = String(fd.get("topic") || SUPPORT_TOPICS[0]);
    const subject = String(fd.get("subject") || "").trim();
    const message = String(fd.get("message") || "").trim();
    const website = String(fd.get("website") || "");

    setPending(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${first} ${last}`.trim(),
          email,
          topic,
          subject,
          message,
          website,
          ...(turnstileToken ? { turnstileToken } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        fallback?: string;
        ticketNumber?: string | null;
      };
      if (res.status === 503 && data.fallback === "email") {
        openMailto(first, last, email, subject, message);
      } else if (!res.ok) {
        setError(data.error || "We couldn’t send your message. Please try again.");
      } else {
        setDone({ ticketNumber: data.ticketNumber ?? null, first, email });
      }
    } catch {
      setError("We couldn’t send your message. Check your connection and try again.");
    }
    setPending(false);
    turnstileRef.current?.reset();
    setTurnstileToken(null);
  }

  if (done) {
    return (
      <div className={`${className} panel-soft p-6`} role="status">
        <p className="card-title">Thanks{done.first ? `, ${done.first}` : ""}! Your message is on its way.</p>
        <p className="card-body mt-2">
          {done.ticketNumber ? (
            <>
              Your reference number is <strong className="text-heading">{done.ticketNumber}</strong>.{" "}
            </>
          ) : null}
          We sent a copy to <strong className="text-heading">{done.email}</strong> and will reply there,
          usually within a couple of days. To add anything, just reply to that email.
        </p>
        {signedInEmail ? (
          <Link href="/account#help" className="btn btn-secondary btn-block mt-4">
            See my messages
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <form className={`${className} space-y-5`} onSubmit={onSubmit} aria-label="Contact form">
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
            maxLength={40}
            autoComplete="given-name"
            defaultValue={defaultFirst || ""}
            key={`first-${defaultFirst || ""}`}
            className={inputClass}
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
            maxLength={40}
            autoComplete="family-name"
            defaultValue={restName.join(" ")}
            key={`last-${restName.join(" ")}`}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-email" className="text-sm font-semibold text-heading">
          {emailLabel} <span className="text-accent">*</span>
        </label>
        {signedInEmail ? (
          <>
            <input id="contact-email" name="email" type="email" value={signedInEmail} readOnly className={`${inputClass} bg-surface-soft`} />
            <p className="mt-1 text-xs text-muted">We’ll reply to the email on your account.</p>
          </>
        ) : (
          <input id="contact-email" name="email" type="email" required autoComplete="email" className={inputClass} />
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-topic" className="text-sm font-semibold text-heading">
            What’s it about?
          </label>
          <select id="contact-topic" name="topic" className={inputClass} defaultValue={SUPPORT_TOPICS[0]}>
            {SUPPORT_TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="contact-subject" className="text-sm font-semibold text-heading">
            Subject
          </label>
          <input id="contact-subject" name="subject" type="text" maxLength={150} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="text-sm font-semibold text-heading">
          {messageLabel} <span className="text-accent">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          className="mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      {/* Leave empty. Hidden from people, catches bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <TurnstileField ref={turnstileRef} onToken={setTurnstileToken} />
      <button
        type="submit"
        disabled={pending || (widgetEnabled && !turnstileToken)}
        className="btn btn-primary btn-block disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale"
      >
        {pending ? "Sending…" : submitLabel}
      </button>
      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {mailtoSent ? (
        <p className="text-sm text-text" role="status">
          {labels?.successCopy || `Opening your email app to send to ${site.email}…`}
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
