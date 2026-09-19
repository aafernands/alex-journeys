"use client";

import { useState } from "react";
import { site } from "@/data/content";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  return (
    <form
      className="mt-10 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const first = String(fd.get("first") || "").trim();
        const last = String(fd.get("last") || "").trim();
        const email = String(fd.get("email") || "").trim();
        const message = String(fd.get("message") || "").trim();
        const subject = encodeURIComponent(
          `Alex Journly contact from ${first}${last ? ` ${last}` : ""}`,
        );
        const body = encodeURIComponent(
          `${message}\n\n—\nFrom: ${first} ${last}\nEmail: ${email}`,
        );
        window.location.href = `mailto:${site.email}?subject=${subject}&body=${body}`;
        setSent(true);
      }}
      aria-label="Contact form"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-first" className="text-sm font-semibold text-heading">
            First name <span className="text-accent">*</span>
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
            Last name
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
          Email <span className="text-accent">*</span>
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
          Message <span className="text-accent">*</span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          className="mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      <button
        type="submit"
        className="btn btn-primary btn-block sm:w-auto"
      >
        Send message
      </button>
      {sent ? (
        <p className="text-sm text-text" role="status">
          Opening your email app to send to {site.email}…
        </p>
      ) : (
        <p className="text-sm text-muted">
          Or email me directly at{" "}
          <a href={`mailto:${site.email}`} className="text-link hover:text-accent">
            {site.email}
          </a>
          .
        </p>
      )}
    </form>
  );
}
