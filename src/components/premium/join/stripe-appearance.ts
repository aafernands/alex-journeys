import type { Appearance } from "@stripe/stripe-js";

/**
 * Stripe Appearance for the Premium Payment Element. Mirrors the site tokens
 * in globals.css (cream paper / warm ink, orange accent) so the card fields
 * look like the rest of the checkout. Stripe needs literal values, not CSS
 * variables, so light and dark are spelled out.
 */
const LIGHT = {
  accent: "#d97706",
  bg: "#fffcf7",
  text: "#2a241c",
  heading: "#1f1a14",
  muted: "#8a7d6b",
  border: "#cbbba3",
  danger: "#b91c1c",
};

const DARK = {
  accent: "#f59e0b",
  bg: "#221e18",
  text: "#e8e0d4",
  heading: "#f6f0e6",
  muted: "#a89884",
  border: "#524636",
  danger: "#f87171",
};

export const STRIPE_FONTS = [
  { cssSrc: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" },
];

export function premiumStripeAppearance(dark: boolean): Appearance {
  const c = dark ? DARK : LIGHT;
  return {
    theme: dark ? "night" : "stripe",
    labels: "above",
    variables: {
      colorPrimary: c.accent,
      colorBackground: c.bg,
      colorText: c.heading,
      colorTextSecondary: c.muted,
      colorTextPlaceholder: c.muted,
      colorDanger: c.danger,
      colorIcon: c.muted,
      fontFamily: "Inter, system-ui, -apple-system, Segoe UI, sans-serif",
      fontSizeBase: "16px",
      fontWeightNormal: "400",
      fontWeightMedium: "600",
      spacingUnit: "5px",
      borderRadius: "12px",
      focusBoxShadow: `0 0 0 3px ${c.accent}33`,
      focusOutline: "none",
    },
    rules: {
      ".Label": {
        color: c.text,
        fontWeight: "600",
        fontSize: "15px",
        marginBottom: "8px",
      },
      ".Input": {
        border: `1px solid ${c.border}`,
        boxShadow: "none",
        padding: "15px 14px",
        fontSize: "17px",
      },
      ".Input:focus": {
        borderColor: c.accent,
        boxShadow: `0 0 0 3px ${c.accent}33`,
      },
      ".Input--invalid": {
        borderColor: c.danger,
        boxShadow: "none",
      },
      ".Tab": {
        border: `1px solid ${c.border}`,
        boxShadow: "none",
        padding: "14px",
      },
      ".Tab:hover": {
        borderColor: c.accent,
      },
      ".Tab--selected, .Tab--selected:focus, .Tab--selected:hover": {
        borderColor: c.accent,
        boxShadow: `0 0 0 1px ${c.accent}`,
        backgroundColor: c.bg,
        color: c.heading,
      },
      ".TabIcon--selected": { fill: c.accent },
      ".TabLabel--selected": { color: c.heading },
      ".Error": { fontSize: "14px" },
    },
  };
}
