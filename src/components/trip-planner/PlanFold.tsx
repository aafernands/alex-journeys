"use client";

import { useId, useState, type ReactNode } from "react";

type Props = {
  id: string;
  title: string;
  meta?: string;
  defaultOpen?: boolean;
  /** Mobile disclosure only. Desktop renders children without this header. */
  mobileOnly?: boolean;
  children: ReactNode;
};

/**
 * Mobile accordion row. Desktop keeps the children in normal flow.
 * The control is a real button with aria-expanded; the panel stays in the
 * accessibility tree on desktop because `max-sm:hidden` does not apply there.
 */
export function PlanFold({
  id,
  title,
  meta,
  defaultOpen = false,
  mobileOnly = false,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-panel`;

  return (
    <section className={mobileOnly ? "plan-fold plan-fold-mobile" : "plan-fold"}>
      <h3 className="sm:hidden">
        <button
          type="button"
          className="plan-fold-toggle"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="plan-fold-title">{title}</span>
          {meta ? <span className="plan-fold-meta">{meta}</span> : null}
          <span className="plan-fold-chevron" aria-hidden="true" />
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-label={title}
        className={open ? "plan-fold-panel" : "plan-fold-panel max-sm:hidden"}
      >
        {children}
      </div>
    </section>
  );
}

/** Short disclosure for help that should stay off the phone’s first screen. */
export function PlanHint({
  label,
  children,
  mobileOnly = false,
}: {
  label: string;
  children: ReactNode;
  mobileOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className={mobileOnly ? "plan-mobile-only" : undefined}>
      <button
        type="button"
        className="plan-text-btn text-muted"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <div id={panelId} hidden={!open} className="plan-body text-muted">
        {children}
      </div>
    </div>
  );
}
