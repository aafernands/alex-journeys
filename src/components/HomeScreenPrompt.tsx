"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { INSTALL_PROMPT_SEEN, installInstructions, isInstallPromptPage } from "@/lib/install-prompt";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function HomeScreenPrompt() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const deferred = useRef<InstallEvent | null>(null);
  const shown = useRef(false);
  const dismissed = useRef(false);

  useEffect(() => {
    const installed = () => window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    let seen = shown.current;
    try { seen ||= localStorage.getItem(INSTALL_PROMPT_SEEN) === "1"; } catch { /* Storage is optional. */ }
    if (installed() || !isInstallPromptPage(pathname) || dismissed.current || seen && !shown.current) return;

    const offer = (event: Event) => {
      if (dismissed.current || installed()) return;
      event.preventDefault();
      deferred.current = event as InstallEvent;
    };
    const finish = () => {
      dismissed.current = true;
      deferred.current = null;
      setVisible(false);
      try { localStorage.setItem(INSTALL_PROMPT_SEEN, "1"); } catch { /* Storage is optional. */ }
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", finish);
    const timer = window.setTimeout(() => {
      if (installed() || shown.current) return;
      shown.current = true;
      try { localStorage.setItem(INSTALL_PROMPT_SEEN, "1"); } catch { /* Avoid repeating within this visit. */ }
      setVisible(true);
    }, 4500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", finish);
    };
  }, [pathname]);

  function dismiss() {
    dismissed.current = true;
    deferred.current = null;
    setVisible(false);
  }

  async function addToHomeScreen() {
    const event = deferred.current;
    if (!event) {
      setInstructions(installInstructions(navigator.userAgent, navigator.maxTouchPoints));
      return;
    }
    setBusy(true);
    deferred.current = null;
    try {
      await event.prompt();
      await event.userChoice;
      dismiss();
    } catch {
      setInstructions(installInstructions(navigator.userAgent, navigator.maxTouchPoints));
    } finally {
      setBusy(false);
    }
  }

  if (!visible || !isInstallPromptPage(pathname)) return null;
  return (
    <aside className="home-screen-prompt" aria-labelledby="home-screen-prompt-title">
      <button type="button" className="home-screen-prompt-close" aria-label="Dismiss home screen invitation" onClick={dismiss}><X size={18} aria-hidden="true" /></button>
      <BrandLogo linked={false} applyScale={false} className="h-auto w-36" width={180} height={54} />
      <h2 id="home-screen-prompt-title" className="mt-3 font-display text-xl font-bold text-heading">Your next journey, one tap away</h2>
      <p className="mt-2 text-sm text-muted">Add Alex Journeys to your home screen for a shortcut to your trips and travel inspiration.</p>
      {instructions ? <p className="home-screen-prompt-help" role="status">{instructions}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary inline-flex items-center gap-2" disabled={busy} onClick={() => void addToHomeScreen()}><Download size={17} aria-hidden="true" />{busy ? "Opening…" : "Add to home screen"}</button>
        <button type="button" className="min-h-11 px-2 text-sm font-semibold text-muted" onClick={dismiss}>{instructions ? "Got it" : "Not now"}</button>
      </div>
    </aside>
  );
}
