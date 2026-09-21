/**
 * Resend inbound webhook verification (Svix) and payload reading.
 * Server-only: uses Node crypto. Do not import from client components.
 *
 * Resend signs the raw body. `email.received` carries metadata only;
 * the body is loaded separately from the receiving API and is not stored.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SEC = 5 * 60;
const MAX_SAMPLE_CHARS = 80_000;

export type ReceivedEvent = {
  emailId: string;
  recipients: string[];
  subject: string;
};

export type SampleEmail = {
  recipients: string[];
  subject: string;
  text: string;
  html: string;
  messageId: string;
};

export function verifyResendWebhook(input: {
  payload: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowMs?: number;
  toleranceSec?: number;
}): boolean {
  const id = input.id?.trim() ?? "";
  const timestamp = input.timestamp?.trim() ?? "";
  const signature = input.signature?.trim() ?? "";
  const secret = input.secret.trim();
  if (!id || !timestamp || !signature || !secret || !input.payload) return false;
  if (!/^\d{1,20}$/.test(timestamp)) return false;

  const nowSec = Math.floor((input.nowMs ?? Date.now()) / 1000);
  const sent = Number(timestamp);
  const tolerance = input.toleranceSec ?? TOLERANCE_SEC;
  if (!Number.isFinite(sent) || Math.abs(nowSec - sent) > tolerance) return false;

  const key = webhookKey(secret);
  if (!key) return false;

  const signed = `${id}.${timestamp}.${input.payload}`;
  const expected = createHmac("sha256", key).update(signed).digest("base64");
  const expectedBuf = Buffer.from(expected);
  for (const part of signature.split(" ")) {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) continue;
    const actual = Buffer.from(value);
    if (actual.length !== expectedBuf.length) continue;
    if (timingSafeEqual(actual, expectedBuf)) return true;
  }
  return false;
}

function webhookKey(secret: string): Buffer | null {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  if (!encoded || !/^[A-Za-z0-9+/_=-]+$/.test(encoded)) return null;
  const key = Buffer.from(encoded, "base64");
  if (key.length < 8) return null;
  return key;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringList(value: unknown): string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim())
    .slice(0, 20);
}

/** Metadata from an `email.received` event. Null when it is not that event. */
export function parseReceivedEvent(payload: unknown): ReceivedEvent | null {
  const record = asRecord(payload);
  if (!record || record.type !== "email.received") return null;
  const data = asRecord(record.data);
  if (!data) return null;
  const emailId = typeof data.email_id === "string" ? data.email_id.trim() : "";
  if (!/^[A-Za-z0-9-]{8,80}$/.test(emailId)) return null;
  const subject = typeof data.subject === "string" ? data.subject.slice(0, 300) : "";
  const recipients = [
    ...stringList(data.to),
    ...stringList(data.cc),
    ...stringList(data.bcc),
    ...stringList(data.received_for),
  ];
  return { emailId, subject, recipients };
}

export function unwrapReceivedContent(body: unknown): {
  text: string;
  html: string;
  subject: string;
} {
  const record = asRecord(body);
  const data = asRecord(record?.data) ?? record;
  if (!data) return { text: "", html: "", subject: "" };
  const text = typeof data.text === "string" ? data.text.slice(0, MAX_SAMPLE_CHARS) : "";
  const html = typeof data.html === "string" ? data.html.slice(0, MAX_SAMPLE_CHARS) : "";
  const subject = typeof data.subject === "string" ? data.subject.slice(0, 300) : "";
  return { text, html, subject };
}

function cleanMessageId(value: string): string {
  const cleaned = value.replace(/[\u0000-\u001f\s]/g, "").slice(0, 180);
  return cleaned.length >= 6 ? cleaned : "";
}

/** Dev harness body. Does not accept a raw provider webhook. */
export function parseSampleEmail(body: unknown):
  | { ok: true; email: SampleEmail }
  | { ok: false; error: string } {
  const record = asRecord(body);
  if (!record) return { ok: false, error: "Invalid JSON body." };
  const recipients = stringList(record.to);
  if (recipients.length === 0) {
    return { ok: false, error: "Add a to address — the one copied from the itinerary." };
  }
  const subject = typeof record.subject === "string" ? record.subject.slice(0, 300) : "";
  const text = typeof record.text === "string" ? record.text : "";
  const html = typeof record.html === "string" ? record.html : "";
  if (text.length > MAX_SAMPLE_CHARS || html.length > MAX_SAMPLE_CHARS) {
    return { ok: false, error: "That sample is too long." };
  }
  const provided = typeof record.messageId === "string" ? record.messageId : "";
  const messageId =
    cleanMessageId(provided) ||
    `sample-${createHash("sha256")
      .update(JSON.stringify({ recipients, subject, text, html }))
      .digest("hex")
      .slice(0, 24)}`;
  return { ok: true, email: { recipients, subject, text, html, messageId } };
}

export function sampleSecretsMatch(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

/** Fetch text/html for a received email. Returns null when the key or email is missing. */
export async function fetchReceivedEmail(emailId: string): Promise<{
  text: string;
  html: string;
  subject: string;
} | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey || !/^[A-Za-z0-9-]{8,80}$/.test(emailId)) return null;
  let response: Response;
  try {
    response = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error("[inbound] receiving fetch failed:", err instanceof Error ? err.name : "error");
    return null;
  }
  if (!response.ok) {
    console.error("[inbound] receiving fetch failed:", response.status);
    return null;
  }
  try {
    return unwrapReceivedContent(await response.json());
  } catch {
    return null;
  }
}
