/**
 * Transactional email via Resend HTTP API.
 *
 * Env:
 * - RESEND_API_KEY (required to send)
 * - EMAIL_FROM optional — default uses Resend’s onboarding address for testing.
 *   Production should use a verified domain, e.g.
 *   `Fernandes Journeys <hello@fernandesjourneys.com>`.
 */

export class EmailNotConfiguredError extends Error {
  constructor(
    message = "Password reset email is not configured. Set RESEND_API_KEY.",
  ) {
    super(message);
    this.name = "EmailNotConfiguredError";
  }
}

export class EmailSendError extends Error {
  constructor(message = "Failed to send email.") {
    super(message);
    this.name = "EmailSendError";
  }
}

const DEFAULT_FROM = "Fernandes Journeys <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  return from || DEFAULT_FROM;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send one email through Resend. Throws EmailNotConfiguredError when the API
 * key is missing; throws EmailSendError on non-2xx responses.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new EmailNotConfiguredError();
  }

  const to = input.to.trim().toLowerCase();
  if (!to) throw new EmailSendError("Recipient email is required.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: [to],
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string };
      if (typeof body.message === "string") detail = body.message;
    } catch {
      /* ignore */
    }
    console.error("[email] Resend send failed:", res.status, detail || "");
    throw new EmailSendError(
      detail
        ? `Failed to send email: ${detail}`
        : `Failed to send email (${res.status}).`,
    );
  }
}

/** Public site origin for reset links (no trailing slash). */
export function publicSiteOrigin(): string {
  const raw =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://www.fernandesjourneys.com";
  return raw.replace(/\/$/, "");
}
