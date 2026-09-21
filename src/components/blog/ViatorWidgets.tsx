"use client";

import { useEffect } from "react";
import {
  VIATOR_WIDGET_SCRIPT_SRC,
  htmlHasViatorWidgets,
} from "@/lib/viator";

type ViatorWindow = Window & { __VIATOR_WIDGET_SCR?: boolean };

const WIDGET_MAIN_SRC =
  "https://www.viator.com/orion/partner/widget-main.js?widgetPreview=false";

/**
 * Viator scans the document once, when widget-main.js runs. Client
 * navigations render new empty divs after that scan, so each page load
 * drops the one-shot flag and runs the loader again. Divs that already
 * have an iframe are hidden from the scan so they are not nested twice.
 */
let chain: Promise<void> = Promise.resolve();

function freshWidgets(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>("[data-vi-partner-id]")].filter(
    (el) => !el.querySelector("iframe"),
  );
}

function loadAndScan(): Promise<void> {
  if (freshWidgets().length === 0) return Promise.resolve();

  const held: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>("[data-vi-partner-id]").forEach((el) => {
    if (!el.querySelector("iframe")) return;
    const id = el.getAttribute("data-vi-partner-id");
    if (id) el.setAttribute("data-vi-partner-id-hold", id);
    el.removeAttribute("data-vi-partner-id");
    held.push(el);
  });

  const restore = () => {
    for (const el of held) {
      const id = el.getAttribute("data-vi-partner-id-hold");
      if (id && !el.getAttribute("data-vi-partner-id")) {
        el.setAttribute("data-vi-partner-id", id);
      }
      el.removeAttribute("data-vi-partner-id-hold");
    }
  };

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      restore();
      resolve();
    };
    const timer = window.setTimeout(finish, 15000);

    delete (window as ViatorWindow).__VIATOR_WIDGET_SCR;
    document
      .querySelectorAll(
        'script[src*="viator.com/orion/partner/widget.js"], script[src*="viator.com/orion/partner/widget-main.js"], script[data-vi-widget]',
      )
      .forEach((node) => node.remove());

    const waitForMain = (main: HTMLScriptElement) => {
      if (freshWidgets().length === 0) {
        finish();
        return;
      }
      main.addEventListener("load", finish, { once: true });
      main.addEventListener("error", finish, { once: true });
    };

    const script = document.createElement("script");
    script.src = VIATOR_WIDGET_SCRIPT_SRC;
    script.async = true;
    script.dataset.viLoader = "1";
    script.onerror = () => {
      const fallback = document.createElement("script");
      fallback.src = WIDGET_MAIN_SRC;
      fallback.async = true;
      fallback.setAttribute("data-vi-widget", "1");
      fallback.onload = finish;
      fallback.onerror = finish;
      document.head.appendChild(fallback);
    };
    script.onload = () => {
      const main = document.querySelector<HTMLScriptElement>(
        "script[data-vi-widget]",
      );
      if (main) {
        waitForMain(main);
        return;
      }
      const fallback = document.createElement("script");
      fallback.src = WIDGET_MAIN_SRC;
      fallback.async = true;
      fallback.setAttribute("data-vi-widget", "1");
      waitForMain(fallback);
      document.head.appendChild(fallback);
    };
    document.body.appendChild(script);
  });
}

function hydrateViatorWidgets(): Promise<void> {
  const run = chain.then(() => loadAndScan());
  chain = run.catch(() => undefined);
  return run;
}

/** Loads the partner widget script once the embed divs are in the DOM. */
export function ViatorWidgets({ html }: { html: string }) {
  const active = htmlHasViatorWidgets(html);

  useEffect(() => {
    if (!active) return;
    void hydrateViatorWidgets();
  }, [active, html]);

  return null;
}
