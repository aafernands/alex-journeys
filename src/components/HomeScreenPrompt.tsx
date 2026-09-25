"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Download, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  INSTALL_AVAILABLE_EVENT,
  INSTALL_DISMISS_KEY,
  INSTALL_INSTALLED_KEY,
  INSTALL_PROMPT_DELAY_MS,
  INSTALL_STATE_EVENT,
  buildInstallGuide,
  dismissUntilValue,
  installButtonLabel,
  installVisibility,
  isInstallPromptPage,
  isRunningStandalone,
  readInstallMemory,
  registerInstallPromptOpener,
  type BeforeInstallPromptEvent,
  type InstallGuide,
  type InstallStep,
} from "@/lib/install-prompt";

function currentGuide(): InstallGuide {
  if (typeof navigator === "undefined") {
    return buildInstallGuide("", 0);
  }
  return buildInstallGuide(navigator.userAgent, navigator.maxTouchPoints);
}

function rememberDismiss() {
  try {
    localStorage.setItem(INSTALL_DISMISS_KEY, dismissUntilValue(Date.now()));
  } catch {
    /* Storage is optional. */
  }
}

function rememberInstalled() {
  try {
    localStorage.setItem(INSTALL_INSTALLED_KEY, "1");
    localStorage.removeItem(INSTALL_DISMISS_KEY);
  } catch {
    /* Storage is optional. */
  }
  window.dispatchEvent(new Event(INSTALL_STATE_EVENT));
}

function eligibleForAutoPrompt(): boolean {
  if (isRunningStandalone()) return false;
  try {
    return installVisibility(readInstallMemory(localStorage), Date.now()) === "eligible";
  } catch {
    return true;
  }
}

function ShareGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d="M12 16V5M8.5 8.5 12 5l3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 10.5H6.2A1.2 1.2 0 0 0 5 11.7v6.6A1.2 1.2 0 0 0 6.2 19.5h11.6a1.2 1.2 0 0 0 1.2-1.2v-6.6a1.2 1.2 0 0 0-1.2-1.2H17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect
        x="4.5"
        y="4.5"
        width="15"
        height="15"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 8.5v7M8.5 12h7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StepIcon({ step }: { step: InstallStep }) {
  return (
    <span className="home-screen-step-icon" aria-hidden="true">
      {step.id === "share" ? <ShareGlyph /> : null}
      {step.id === "add" ? <AddGlyph /> : null}
      {step.id === "confirm" ? <span className="home-screen-add-chip">Add</span> : null}
    </span>
  );
}

export function HomeScreenPrompt() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (isRunningStandalone()) return;

    const syncPrompt = () => {
      const event = window.__ajInstallPrompt;
      if (!event) return;
      setCanPrompt(true);
      try {
        localStorage.removeItem(INSTALL_INSTALLED_KEY);
      } catch {
        /* Storage is optional. */
      }
      window.dispatchEvent(new Event(INSTALL_STATE_EVENT));
    };
    syncPrompt();

    const onAvailable = () => syncPrompt();
    const onInstalled = () => {
      setCanPrompt(false);
      setOpen(false);
      setManual(false);
      setBusy(false);
    };
    window.addEventListener(INSTALL_AVAILABLE_EVENT, onAvailable);
    window.addEventListener("appinstalled", onInstalled);

    const beginNativePrompt = (event: BeforeInstallPromptEvent) => {
      window.__ajInstallPrompt = null;
      setCanPrompt(false);
      setBusy(true);
      const pending = event.prompt();
      void Promise.resolve(pending)
        .then((result) => {
          if (result && typeof result === "object" && "outcome" in result) return result;
          return event.userChoice;
        })
        .then((choice) => {
          if (choice.outcome === "accepted") rememberInstalled();
          else rememberDismiss();
          setOpen(false);
          setManual(false);
        })
        .catch(() => {
          setManual(true);
          setOpen(true);
        })
        .finally(() => setBusy(false));
    };

    const unregister = registerInstallPromptOpener(() => {
      if (isRunningStandalone()) return;
      const event = window.__ajInstallPrompt;
      if (event) {
        beginNativePrompt(event);
        return;
      }
      setManual(true);
      setOpen(true);
    });

    return () => {
      unregister();
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, onAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (manual) return;
    if (!isInstallPromptPage(pathname)) return;
    if (!eligibleForAutoPrompt()) return;
    const nextGuide = currentGuide();
    const nativeReady = canPrompt || Boolean(window.__ajInstallPrompt);
    const showGuide = nextGuide.steps.length > 0 || Boolean(nextGuide.inAppMessage);
    if (!showGuide && !nativeReady) return;
    if (openRef.current) return;

    let cancelled = false;
    let timer = 0;
    const tryOpen = () => {
      if (cancelled || openRef.current) return;
      if (!eligibleForAutoPrompt() || !isInstallPromptPage(window.location.pathname)) return;
      if (document.querySelector(".mobile-nav-drawer-shell, dialog[open]")) {
        timer = window.setTimeout(tryOpen, 1000);
        return;
      }
      setOpen(true);
    };
    timer = window.setTimeout(tryOpen, INSTALL_PROMPT_DELAY_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, canPrompt, manual]);

  const guide: InstallGuide = currentGuide();
  const visible = open && (manual || isInstallPromptPage(pathname));

  useEffect(() => {
    if (!visible) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (dialog.isConnected && !dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      const back = returnFocus.current;
      returnFocus.current = null;
      if (back?.isConnected) back.focus();
    };
  }, [visible]);

  function dismiss() {
    rememberDismiss();
    setManual(false);
    setOpen(false);
    setBusy(false);
  }

  function install() {
    const event = window.__ajInstallPrompt;
    if (!event || busy) return;
    window.__ajInstallPrompt = null;
    setCanPrompt(false);
    setBusy(true);
    const pending = event.prompt();
    void Promise.resolve(pending)
      .then((result) => {
        if (result && typeof result === "object" && "outcome" in result) return result;
        return event.userChoice;
      })
      .then((choice) => {
        if (choice.outcome === "accepted") rememberInstalled();
        else rememberDismiss();
        setManual(false);
        setOpen(false);
      })
      .catch(() => {
        setCanPrompt(false);
      })
      .finally(() => setBusy(false));
  }

  if (!visible) return null;

  const nativeReady = Boolean(window.__ajInstallPrompt);
  const showSteps = !nativeReady && guide.steps.length > 0;
  const showFallback = !nativeReady && !showSteps;
  const label =
    typeof navigator === "undefined" ? "Install" : installButtonLabel(navigator.userAgent);

  return (
    <dialog
      ref={dialogRef}
      className="home-screen-prompt"
      aria-labelledby="home-screen-prompt-title"
      aria-describedby="home-screen-prompt-desc"
      onClick={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
    >
      <button
        type="button"
        className="home-screen-prompt-close"
        aria-label="Dismiss home screen invitation"
        onClick={dismiss}
      >
        <X size={18} aria-hidden="true" />
      </button>
      <BrandLogo linked={false} applyScale={false} className="h-auto w-36" width={180} height={54} />
      <h2 id="home-screen-prompt-title" className="mt-3 font-display text-xl font-bold text-heading">
        Your next journey, one tap away
      </h2>
      <p id="home-screen-prompt-desc" className="mt-2 text-sm leading-relaxed text-muted">
        Add Alex Journeys to your home screen for a shortcut to your trips and travel inspiration.
      </p>
      {guide.inAppMessage && !nativeReady ? (
        <p className="home-screen-prompt-help" role="note">
          {guide.inAppMessage}
        </p>
      ) : null}
      {showSteps ? (
        <ol className="home-screen-steps" aria-label="Steps to add Alex Journeys to your home screen">
          {guide.steps.map((step) => (
            <li key={step.id} className="home-screen-step">
              <StepIcon step={step} />
              <span>
                <span className="home-screen-step-title">{step.title}</span>
                <span className="home-screen-step-detail">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      ) : null}
      {showFallback && guide.fallback ? (
        <p className="home-screen-prompt-help" role="status">
          {guide.fallback}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {nativeReady ? (
          <button
            type="button"
            className="btn btn-primary inline-flex items-center gap-2"
            disabled={busy}
            onClick={install}
          >
            <Download size={17} aria-hidden="true" />
            {busy ? "Opening…" : label}
          </button>
        ) : null}
        <button
          type="button"
          className={`btn min-h-11 ${nativeReady ? "btn-secondary" : "btn-primary"}`}
          onClick={dismiss}
        >
          {nativeReady ? "Not now" : "Got it"}
        </button>
      </div>
    </dialog>
  );
}
