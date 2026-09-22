/** Viator Orion partner widgets recovered from alexjournly.com. */

export const VIATOR_PARTNER_ID = "P00143772";

/** Official embed loader. It pulls in widget-main.js, which paints the cards. */
export const VIATOR_WIDGET_SCRIPT_SRC =
  "https://www.viator.com/orion/partner/widget.js";

const WIDGET_REF_RE =
  /^W-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Viator partner ids look like P00143772. */
const PARTNER_ID_RE = /^P[0-9A-Z]{5,20}$/;

export function isViatorWidgetRef(widgetRef: string): boolean {
  return WIDGET_REF_RE.test(widgetRef);
}

export function isViatorPartnerId(partnerId: string): boolean {
  return PARTNER_ID_RE.test(partnerId);
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Partner card shell. Does not include the loader script or any tour copy. */
export function viatorWidgetMarkup(widgetRef: string, partnerId: string): string {
  return `<div class="viator-widget" data-vi-partner-id="${escapeHtmlAttr(partnerId)}" data-vi-widget-ref="${escapeHtmlAttr(widgetRef)}"></div>`;
}

export function viatorWidgetDiv(
  widgetRef: string,
  partnerId: string = VIATOR_PARTNER_ID,
): string {
  if (partnerId !== VIATOR_PARTNER_ID) {
    throw new Error("Unexpected Viator partner id.");
  }
  if (!isViatorWidgetRef(widgetRef)) {
    throw new Error(`Invalid Viator widget ref: ${widgetRef}`);
  }
  return viatorWidgetMarkup(widgetRef, partnerId);
}

export function htmlHasViatorWidgets(html: string): boolean {
  return /data-vi-widget-ref\s*=\s*["']W-/i.test(html);
}

export type ViatorDynamicWidgetInput = {
  partnerId: string;
  /** Dynamic widget ref from Viator Widgets Hub. Omitted when it is not a W-… id. */
  widgetRef?: string;
  searchTerm: string;
  campaign?: string;
  language?: string;
  currency?: string;
  travelDateFrom?: string;
  travelDateTo?: string;
  adults?: number | null;
  children?: number | null;
};

/**
 * One Dynamic widget for any destination. Book Now stays inside Viator’s
 * iframe and is attributed by the partner id (and campaign, when set).
 * Do not rewrite those iframe navigations through /out.
 */
export function viatorDynamicWidgetMarkup(input: ViatorDynamicWidgetInput): string {
  const searchTerm = input.searchTerm.trim();
  if (!searchTerm || !isViatorPartnerId(input.partnerId)) return "";

  const attrs = [
    `class="viator-widget"`,
    attr("data-vi-partner-id", input.partnerId),
    isViatorWidgetRef(input.widgetRef ?? "")
      ? attr("data-vi-widget-ref", input.widgetRef)
      : null,
    attr("data-vi-search-term", searchTerm),
    attr("data-vi-campaign", input.campaign),
    attr("data-vi-language", input.language),
    attr("data-vi-currency", input.currency),
    attr("data-vi-travel-date-from", input.travelDateFrom),
    attr("data-vi-travel-date-to", input.travelDateTo),
    input.adults && input.adults > 0
      ? attr("data-vi-travellers-adults", String(input.adults))
      : null,
    input.children && input.children > 0
      ? attr("data-vi-travellers-children", String(input.children))
      : null,
  ].filter((part): part is string => Boolean(part));

  return `<div ${attrs.join(" ")}></div>`;
}

function attr(name: string, value: string | undefined | null): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  return `${name}="${escapeHtmlAttr(trimmed)}"`;
}
