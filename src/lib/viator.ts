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
