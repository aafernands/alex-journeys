/**
 * Plan a Trip density class hooks.
 * Metrics live in globals.css (`.plan-trip` and `.plan-*`).
 * Pair these with existing color utilities — do not encode palette or font family here.
 */

export const plan = {
  h2: "plan-h2 font-display text-heading",
  h3: "plan-h3 font-display text-heading",
  h4: "plan-h4 font-display text-heading",
  body: "plan-body",
  prose: "plan-body plan-prose",
  caption: "plan-caption",
  label: "plan-label text-muted",
  chip: "plan-chip border transition",
  badge: "plan-badge",
  textBtn: "plan-text-btn",
  input:
    "plan-input plan-control placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25",
  panel: "panel plan-panel",
  soft: "panel-soft plan-inset",
  inset: "plan-inset border border-border bg-white",
  chipCard: "plan-chip-card border",
  error: "plan-caption font-semibold text-link",
  check: "plan-check plan-body font-semibold text-heading",
  checkInput: "plan-check-input accent-[var(--accent)]",
} as const;
