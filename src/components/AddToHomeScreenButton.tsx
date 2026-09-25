"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  INSTALL_INSTALLED_KEY,
  INSTALL_STATE_EVENT,
  isRunningStandalone,
  requestInstallPrompt,
} from "@/lib/install-prompt";

export function useInstallOffer(): boolean {
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    const sync = () => {
      let installed = false;
      try {
        installed = localStorage.getItem(INSTALL_INSTALLED_KEY) === "1";
      } catch {
        installed = false;
      }
      setOffer(!isRunningStandalone() && !installed);
    };
    sync();
    window.addEventListener(INSTALL_STATE_EVENT, sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      window.removeEventListener(INSTALL_STATE_EVENT, sync);
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
