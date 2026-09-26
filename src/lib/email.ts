/**
 * Transactional email via Resend HTTP API.
 *
 * Env:
 * - RESEND_API_KEY (required to send)
 * - EMAIL_FROM optional — default uses Resend’s onboarding address for testing.
 *   Production should use a verified domain, e.g.
 *   `Alex Journeys Support <support@alexjourneys.com>`.
 * - EMAIL_REPLY_TO optional — where replies go. Defaults to SUPPORT_EMAIL.
 * - SUPPORT_EMAIL optional — shown in email footers. Default
 *   `support@alexjourneys.com`.
 *
 * See docs/EMAILS.md for the full list of emails and DNS setup.
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

const DEFAULT_SUPPORT_EMAIL = "support@alexjourneys.com";

/** Support address shown in email footers and used as the default reply-to. */
export function supportEmailAddress(): string {
  return process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}

/** Reply-To header for outgoing mail. */
export function emailReplyToAddress(): string {
  return process.env.EMAIL_REPLY_TO?.trim() || supportEmailAddress();
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** Overrides the default reply-to (EMAIL_REPLY_TO / SUPPORT_EMAIL). */
  replyTo?: string;
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
      reply_to: input.replyTo?.trim() || emailReplyToAddress(),
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

export type SafeSendResult =
  | { status: "sent" }
  | { status: "skipped"; reason: "not_configured" }
  | { status: "failed"; error: string };

/**
 * Send without throwing. When RESEND_API_KEY is missing the email is logged
 * and skipped, so background senders (Stripe webhook, sign-up) never crash.
 */
export async function sendEmailSafe(
  input: SendEmailInput,
  label = "email",
): Promise<SafeSendResult> {
  if (!isEmailConfigured()) {
    console.info(`[email] ${label} skipped: RESEND_API_KEY is not set.`);
    return { status: "skipped", reason: "not_configured" };
  }
  try {
    await sendEmail(input);
    return { status: "sent" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Failed to send email.";
    console.error(`[email] ${label} failed:`, error);
    return { status: "failed", error };
  }
}
