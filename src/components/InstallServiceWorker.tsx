"use client";

import { useEffect } from "react";

/**
 * Registers the network-only install worker on production builds
 * (Vercel preview and production). `next dev` skips it so local
 * navigation is never claimed by a worker.
 */
export function InstallServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* The manifest can still make current Chrome installable. */
        });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
