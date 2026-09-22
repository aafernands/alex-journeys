"use client";

import { useEffect } from "react";
import { hydrateViatorWidgets } from "@/components/blog/ViatorWidgets";

type Props = {
  markup: string;
  /** True once a real Dynamic widget ref is configured. */
  ready: boolean;
};

/**
 * Mounts the Dynamic widget div, then runs the same Orion loader used on
 * journal posts. The loader scans data-vi-partner-id, including this page
 * before a widget ref has been pasted.
 */
export function ExperiencesViatorMount({ markup, ready }: Props) {
  useEffect(() => {
    if (!markup.includes("data-vi-partner-id")) return;
    void hydrateViatorWidgets();
  }, [markup]);

  if (!markup) return null;

  return (
    <div
      className={
        ready
          ? "experiences-widget experiences-widget-ready"
          : "experiences-widget"
      }
      data-testid="viator-experiences"
    >
      {ready ? (
        <p className="experiences-widget-loading text-sm text-muted">
          Loading experiences…
        </p>
      ) : null}
      <div dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}
