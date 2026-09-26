/**
 * Branded shell for every Alex Journeys email: orange header band with the
 * brand name and a short status line, "Hi {first name}", body copy, an
 * optional details table, one button, a short note, the team sign-off, and a
 * footer with the support address. Returns HTML and a plain-text twin.
 *
 * Layout follows the Nurse Intensive emails (inline styles, table layout,
 * no external CSS) so it renders the same in Gmail, Apple Mail and Outlook.
 * Pure module: safe to import from tests, preview routes and scripts.
 */

export const EMAIL_BRAND = {
  name: "Alex Journeys",
  team: "The Alex Journeys Team",
  orange: "#d97706",
  orangeDeep: "#b45309",
  cream: "#f6f0e6",
  ink: "#2a241c",
  muted: "#6b6152",
  soft: "#fbf7f0",
  line: "#eadfcd",
  badge: "#fef3c7",
} as const;

/** A run of inline text. Strings are escaped; bold and links are marked up. */
export type InlinePart = string | { bold: string } | { link: string; href: string };
export type Paragraph = string | InlinePart[];

export type EmailDetail = { label: string; value: string };

export type EmailContent = {
  subject: string;
  /** Short preview line shown by inbox apps next to the subject. */
  preheader: string;
  /** Status line under the brand name, e.g. "✓ Subscription Renewed Successfully". */
  badge: string;
  /** First name, or null for "Hi there". */
  firstName: string | null;
  paragraphs: Paragraph[];
  details?: EmailDetail[];
  /** Large one-time code block (email verification). */
  code?: string;
  cta?: { label: string; url: string };
  /** Small print under the button. */
  note?: Paragraph;
  /** Paragraphs after the note, before the sign-off. */
  closing?: Paragraph[];
  supportEmail: string;
  siteUrl: string;
  year?: number;
};

export type RenderedEmail = { subject: string; html: string; text: string };

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** "Maria Lopez" → "Maria". Empty → null. */
export function firstNameOf(name: string | null | undefined): string | null {
  const clean = (name ?? "").trim();
  if (!clean) return null;
  const first = clean.split(/\s+/)[0] ?? "";
  return first.slice(0, 40) || null;
}

function partsOf(p: Paragraph): InlinePart[] {
  return typeof p === "string" ? [p] : p;
}

function inlineHtml(p: Paragraph, linkColor: string = EMAIL_BRAND.orangeDeep): string {
  return partsOf(p)
    .map((part) => {
      if (typeof part === "string") return escapeHtml(part);
      if ("bold" in part) return `<strong>${escapeHtml(part.bold)}</strong>`;
      return `<a href="${escapeHtml(part.href)}" style="color: ${linkColor}; text-decoration: underline;">${escapeHtml(part.link)}</a>`;
    })
    .join("");
}

function inlineText(p: Paragraph): string {
  return partsOf(p)
    .map((part) => {
      if (typeof part === "string") return part;
      if ("bold" in part) return part.bold;
      return `${part.link} (${part.href})`;
    })
    .join("");
}

function siteHost(siteUrl: string): string {
  try {
    return new URL(siteUrl).host.replace(/^www\./, "");
  } catch {
    return "alexjourneys.com";
  }
}

export function renderEmail(content: EmailContent): RenderedEmail {
  const b = EMAIL_BRAND;
  const year = content.year ?? new Date().getFullYear();
  const greetingName = content.firstName || "there";
  const host = siteHost(content.siteUrl);

  const paragraphsHtml = content.paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: ${b.ink};">${inlineHtml(p)}</p>`,
    )
    .join("\n");

  const details = content.details ?? [];
  const detailsHtml = details.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: separate; border-spacing: 0; background-color: ${b.soft}; border-radius: 12px; border: 1px solid ${b.line}; margin: 8px 0 24px 0; font-size: 14px;">
${details
  .map((d, i) => {
    const border = i < details.length - 1 ? `border-bottom: 1px solid ${b.line};` : "";
    return `  <tr>
    <td style="padding: 12px 16px; ${border} color: ${b.muted}; font-weight: 600; width: 45%;">${escapeHtml(d.label)}</td>
    <td style="padding: 12px 16px; ${border} color: ${b.ink}; font-weight: 700;">${escapeHtml(d.value)}</td>
  </tr>`;
  })
  .join("\n")}
</table>`
    : "";

  const codeHtml = content.code
    ? `<div style="margin: 8px 0 24px 0; text-align: center;">
  <div style="display: inline-block; padding: 14px 28px; background-color: ${b.soft}; border: 1px dashed ${b.orange}; border-radius: 12px; font-size: 30px; font-weight: 800; letter-spacing: 0.3em; color: ${b.ink}; font-family: 'SFMono-Regular', Menlo, Consolas, monospace;">${escapeHtml(content.code)}</div>
</div>`
    : "";

  const ctaHtml = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px auto;">
  <tr>
    <td style="border-radius: 10px; background-color: ${b.orange};">
      <a class="aj-btn" href="${escapeHtml(content.cta.url)}" style="display: inline-block; background-color: ${b.orange}; color: #ffffff; font-size: 15px; font-weight: 700; text-decoration: none; padding: 13px 30px; border-radius: 10px;">${escapeHtml(content.cta.label)}</a>
    </td>
  </tr>
</table>`
    : "";

  const noteHtml = content.note
    ? `<p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.6; color: ${b.muted};">${inlineHtml(content.note)}</p>`
    : "";

  const closingHtml = (content.closing ?? [])
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: ${b.ink};">${inlineHtml(p)}</p>`,
    )
    .join("\n");

  const support = escapeHtml(content.supportEmail);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(content.subject)}</title>
  <style>
    a.aj-btn:hover { background-color: ${b.orangeDeep} !important; }
  </style>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: ${b.cream}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${b.ink}; -webkit-font-smoothing: antialiased;">
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(content.preheader)}</div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid ${b.line};">
    <tr>
      <td style="padding: 28px 32px 24px 32px; background-color: ${b.orange}; text-align: left;">
        <span style="font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.01em; display: block;">${escapeHtml(b.name)}</span>
        <span style="font-size: 13px; color: ${b.badge}; font-weight: 700; margin-top: 4px; display: inline-block;">${escapeHtml(content.badge)}</span>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px 32px 24px 32px;">
        <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${b.ink};">Hi <strong>${escapeHtml(greetingName)}</strong>,</p>
${paragraphsHtml}
${codeHtml}
${detailsHtml}
${ctaHtml}
${noteHtml}
${closingHtml}
        <p style="margin: 8px 0 0 0; font-size: 14px; line-height: 1.6; color: ${b.ink};">Warm regards,<br><strong>${escapeHtml(b.team)}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px; background-color: ${b.soft}; border-top: 1px solid ${b.line}; font-size: 12px; color: ${b.muted}; line-height: 1.6;">
        <p style="margin: 0 0 4px 0;">Questions? Just reply to this email or write to <a href="mailto:${support}" style="color: ${b.orangeDeep}; text-decoration: underline;">${support}</a>.</p>
        <p style="margin: 0; color: #9a8f7d; font-size: 11px;">&copy; ${year} ${escapeHtml(b.name)} &bull; <a href="${escapeHtml(content.siteUrl)}" style="color: #9a8f7d; text-decoration: none;">${escapeHtml(host)}</a></p>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines: string[] = [`Hi ${greetingName},`, ""];
  for (const p of content.paragraphs) textLines.push(inlineText(p), "");
  if (content.code) textLines.push(`Your code: ${content.code}`, "");
  if (details.length) {
    const width = Math.max(...details.map((d) => d.label.length)) + 2;
    for (const d of details) textLines.push(`${`${d.label}:`.padEnd(width)} ${d.value}`);
    textLines.push("");
  }
  if (content.cta) textLines.push(`${content.cta.label}: ${content.cta.url}`, "");
  if (content.note) textLines.push(inlineText(content.note), "");
  for (const p of content.closing ?? []) textLines.push(inlineText(p), "");
  textLines.push("Warm regards,", b.team, "", "—", `Questions? Just reply to this email or write to ${content.supportEmail}.`, `© ${year} ${b.name} · ${host}`);

  return { subject: content.subject, html, text: textLines.join("\n") };
}
