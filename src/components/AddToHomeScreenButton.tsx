"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  INSTALL_AVAILABLE_EVENT,
  INSTALL_INSTALLED_KEY,
  INSTALL_STATE_EVENT,
  buildInstallGuide,
  installCanBeOffered,
  isRunningStandalone,
  requestInstallPrompt,
} from "@/lib/install-prompt";

function installIsAvailable(): boolean {
  if (isRunningStandalone()) return false;
  try {
    if (localStorage.getItem(INSTALL_INSTALLED_KEY) === "1") return false;
  } catch {
    /* Storage is optional. */
  }
  const guide = buildInstallGuide(navigator.userAgent, navigator.maxTouchPoints ?? 0);
  return installCanBeOffered(guide) || Boolean(window.__ajInstallPrompt);
}

export function useInstallOffer(): boolean {
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    const sync = () => setOffer(installIsAvailable());
    sync();
    window.addEventListener(INSTALL_STATE_EVENT, sync);
    window.addEventListener(INSTALL_AVAILABLE_EVENT, sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      window.removeEventListener(INSTALL_STATE_EVENT, sync);
      window.removeEventListener(INSTALL_AVAILABLE_EVENT, sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);

  return offer;
}

export function AddToHomeScreenButton({
  className,
  onPress,
}: {
  className?: string;
  onPress?: () => void;
}) {
  const offer = useInstallOffer();
  if (!offer) return null;

  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        requestInstallPrompt();
        onPress?.();
      }}
    >
      <Download size={18} aria-hidden="true" />
      Add to home screen
    </button>
  );
}
