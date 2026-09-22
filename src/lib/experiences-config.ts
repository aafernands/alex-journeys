/**
 * Viator Dynamic widget settings for /experiences.
 *
 * Paste the ref from Viator Widgets Hub into either:
 * - `dynamicWidgetRef` in src/content/experiences/viator.json
 * - the `VIATOR_DYNAMIC_WIDGET_REF` environment variable (wins when it is a W-… id)
 *
 * Partner id defaults to P00143772. Override with `partnerId` in that JSON
 * file or `VIATOR_PARTNER_ID` when Viator issues a different id.
 *
 * The page still renders and loads widget.js before a ref is pasted. Without
 * a real ref, Viator will not paint cards; the search link keeps commission
 * via pid + mcid + campaign through /out.
 */

import fs from "node:fs";
import path from "node:path";
import {
  EXPERIENCES_CAMPAIGN,
  VIATOR_DYNAMIC_WIDGET_REF_PLACEHOLDER,
  type ViatorExperiencesSettings,
} from "@/lib/experiences";
import {
  VIATOR_PARTNER_ID,
  isViatorPartnerId,
  isViatorWidgetRef,
} from "@/lib/viator";

const FILE = path.join(process.cwd(), "src/content/experiences/viator.json");

function readFile(): Record<string, unknown> {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf8")) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* missing or invalid file — defaults still ship the page */
  }
  return {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanCampaign(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 40) {
    return value;
  }
  return EXPERIENCES_CAMPAIGN;
}

function cleanLanguage(raw: string): string {
  const value = raw.trim().toLowerCase();
  return /^[a-z]{2}(?:-[a-z]{2})?$/.test(value) ? value : "en";
}

function cleanCurrency(raw: string): string {
  const value = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : "";
}

export function getViatorExperiencesConfig(): ViatorExperiencesSettings {
  const file = readFile();
  const partnerFromEnv = process.env.VIATOR_PARTNER_ID?.trim() ?? "";
  const partnerFromFile = text(file.partnerId);
  const partnerId = isViatorPartnerId(partnerFromEnv)
    ? partnerFromEnv
    : isViatorPartnerId(partnerFromFile)
      ? partnerFromFile
      : VIATOR_PARTNER_ID;

  const refFromEnv = process.env.VIATOR_DYNAMIC_WIDGET_REF?.trim() ?? "";
  const refFromFile = text(file.dynamicWidgetRef);
  const widgetRef = isViatorWidgetRef(refFromEnv)
    ? refFromEnv
    : isViatorWidgetRef(refFromFile)
      ? refFromFile
      : VIATOR_DYNAMIC_WIDGET_REF_PLACEHOLDER;

  return {
    partnerId,
    widgetRef,
    campaign: cleanCampaign(text(file.campaign) || EXPERIENCES_CAMPAIGN),
    language: cleanLanguage(text(file.language) || "en"),
    currency: cleanCurrency(text(file.currency) || "USD"),
    widgetReady: isViatorWidgetRef(widgetRef),
  };
}
