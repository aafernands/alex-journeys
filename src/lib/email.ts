/**
 * Transactional email via Resend HTTP API.
 *
 * Env:
 * - RESEND_API_KEY (required to send)
 * - EMAIL_FROM optional — default uses Resend’s onboarding address for testing.
 *   Production should use a verified domain, e.g.
 *   `Alex Journeys <contact@alexjourneys.com>`.
 *
 * With the default `onboarding@resend.dev` sender, Resend only delivers to the
 * email address on the Resend account until a custom domain is verified.
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

/** Resend’s shared testing sender — valid per current Resend docs. */
const DEFAULT_FROM = "Alex Journeys <onboarding@resend.dev>";

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

/** Strip secrets / truncate for safe client-facing copy. */
export function clientSafeEmailErrorMessage(raw: string): string {
  const cleaned = raw
    .replace(/\bre_[A-Za-z0-9_]+\b/g, "[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "Failed to send email.";
  return cleaned.length > 400 ? `${cleaned.slice(0, 397)}…` : cleaned;
}

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
    let errorName = "";
    try {
      const body = (await res.json()) as {
        message?: string;
        name?: string;
      };
      if (typeof body.message === "string" && body.message.trim()) {
        detail = body.message.trim();
      }
      if (typeof body.name === "string" && body.name.trim()) {
        errorName = body.name.trim();
      }
    } catch {
      /* ignore non-JSON bodies */
    }
    console.error(
      "[email] Resend send failed:",
      res.status,
      errorName || "",
      detail || "",
    );
    // Prefer Resend's human `message`; append short `name` only when useful.
    let clientMsg: string;
    if (detail) {
      clientMsg =
        errorName && !detail.toLowerCase().includes(errorName.toLowerCase())
          ? `Failed to send email: ${detail} (${errorName})`
          : `Failed to send email: ${detail}`;
    } else {
      clientMsg = `Failed to send email (${res.status}).`;
    }
    throw new EmailSendError(clientSafeEmailErrorMessage(clientMsg));
  }
}

/** Public site origin for reset links (no trailing slash). */
export function publicSiteOrigin(): string {
  const raw =
    process.env.AUTH_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "https://www.alexjourneys.com";
  return raw.replace(/\/$/, "");
}
