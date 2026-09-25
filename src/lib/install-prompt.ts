/**
 * Home-screen install prompt rules.
 * Pure helpers so timing, platform copy, and dismissal can be tested
 * without a browser. The old `aj.home-screen-prompt-seen` flag is
 * intentionally ignored: it was set the moment the first version appeared,
 * and this prompt should reach people who only saw that text.
 */

export const INSTALL_DISMISS_KEY = "aj.home-screen-dismiss-until";
export const INSTALL_INSTALLED_KEY = "aj.home-screen-installed";
export const INSTALL_DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
export const INSTALL_PROMPT_DELAY_MS = 4500;
export const INSTALL_STATE_EVENT = "aj-install-state";
export const INSTALL_AVAILABLE_EVENT = "aj-install-available";

export const INSTALL_CAPTURE_SCRIPT = `(function(){try{window.__ajInstallPrompt=null;window.addEventListener("beforeinstallprompt",function(event){event.preventDefault();window.__ajInstallPrompt=event;window.dispatchEvent(new Event("${INSTALL_AVAILABLE_EVENT}"));});window.addEventListener("appinstalled",function(){window.__ajInstallPrompt=null;try{localStorage.setItem("${INSTALL_INSTALLED_KEY}","1");localStorage.removeItem("${INSTALL_DISMISS_KEY}");}catch(e){}window.dispatchEvent(new Event("${INSTALL_STATE_EVENT}"));});}catch(e){}})();`;

const BLOCKED_PREFIX =
  /^\/(cms|api|account|login|signup|forgot-password|reset-password)(\/|$)/;
const BOOKING_PATH = /\/(checkout|confirmation)(\/|$)/;
const FLIGHT_BOOK = /^\/flights\/book(\/|$)/;

export function isInstallPromptPage(pathname: string): boolean {
  if (!pathname) return false;
  if (BLOCKED_PREFIX.test(pathname)) return false;
  if (BOOKING_PATH.test(pathname)) return false;
  if (FLIGHT_BOOK.test(pathname)) return false;
  return true;
}

export type InstallMemory = {
  installed: string | null;
  dismissUntil: string | null;
};

export type InstallVisibility = "installed" | "snoozed" | "eligible";

export function installVisibility(
  memory: InstallMemory,
  now: number,
): InstallVisibility {
  if (memory.installed === "1") return "installed";
  const until = Number(memory.dismissUntil);
  if (Number.isFinite(until) && until > now) return "snoozed";
  return "eligible";
}

export function dismissUntilValue(now: number): string {
  return String(now + INSTALL_DISMISS_MS);
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  navigatorStandalone: boolean | undefined,
): boolean {
  return displayModeStandalone || navigatorStandalone === true;
}

export function isRunningStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return isStandaloneDisplay(
    window.matchMedia("(display-mode: standalone)").matches,
    nav.standalone,
  );
}

export type InstallStepId = "share" | "add" | "confirm";

export type InstallStep = {
  id: InstallStepId;
  title: string;
  detail: string;
};

export type SharePlacement = "bottom-bar" | "top-bar" | "menu";

export type InstallGuide = {
  /** Chromium can open the native install dialog from a user gesture. */
  native: boolean;
  inAppName: string | null;
  sharePlacement: SharePlacement | null;
  browserLabel: string | null;
  steps: InstallStep[];
  inAppMessage: string | null;
  /** Copy for browsers that cannot open a native install dialog. */
  fallback: string | null;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" } | void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __ajInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type { BeforeInstallPromptEvent };

const IN_APP_BROWSERS: { pattern: RegExp; name: string }[] = [
  { pattern: /Instagram/i, name: "Instagram" },
  { pattern: /Messenger/i, name: "Messenger" },
  { pattern: /FBAN|FBAV|FB_IAB|FBIOS/i, name: "Facebook" },
  { pattern: /TikTok|musical_ly/i, name: "TikTok" },
  { pattern: /Snapchat/i, name: "Snapchat" },
  { pattern: /Pinterest/i, name: "Pinterest" },
  { pattern: /\bLinkedIn/i, name: "LinkedIn" },
  { pattern: /MicroMessenger/i, name: "WeChat" },
  { pattern: /\bLine\//i, name: "LINE" },
  { pattern: /\bTwitter/i, name: "X" },
  { pattern: /GSA\//i, name: "Google" },
];

function inAppName(userAgent: string): string | null {
  return IN_APP_BROWSERS.find((app) => app.pattern.test(userAgent))?.name ?? null;
}

function isIosDevice(userAgent: string, touchPoints: number): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && touchPoints > 1;
}

function isIpad(userAgent: string, touchPoints: number): boolean {
  if (/iPad/.test(userAgent)) return true;
  return /Macintosh/.test(userAgent) && touchPoints > 1 && !/iPhone|iPod/.test(userAgent);
}

function iosBrowserLabel(userAgent: string): string | null {
  if (/CriOS/i.test(userAgent)) return "Chrome";
  if (/FxiOS/i.test(userAgent)) return "Firefox";
  if (/EdgiOS/i.test(userAgent)) return "Edge";
  if (/OPiOS/i.test(userAgent)) return "Opera";
  if (/DuckDuckGo/i.test(userAgent)) return "DuckDuckGo";
  return null;
}

function isChromiumBrowser(userAgent: string): boolean {
  if (/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)) return false;
  return /Chrome|Chromium|Edg\/|SamsungBrowser|OPR\//i.test(userAgent);
}

function shareDetail(placement: SharePlacement, browserLabel: string | null): string {
  if (placement === "bottom-bar") {
    return "Tap Share in the bar at the bottom of Safari. The icon is a square with an arrow pointing up.";
  }
  if (placement === "top-bar") {
    return "Tap Share at the top of Safari. The icon is a square with an arrow pointing up.";
  }
  const menu = browserLabel ? `the ${browserLabel} menu` : "the browser menu";
  return `Open ${menu} and tap Share. The icon is a square with an arrow pointing up.`;
}

function homeScreenSteps(
  placement: SharePlacement,
  browserLabel: string | null,
): InstallStep[] {
  return [
    {
      id: "share",
      title: "Tap Share",
      detail: shareDetail(placement, browserLabel),
    },
    {
      id: "add",
      title: "Add to Home Screen",
      detail: "Scroll the share sheet until you see Add to Home Screen, then tap it.",
    },
    {
      id: "confirm",
      title: "Tap Add",
      detail: "Tap Add to place Alex Journeys on your home screen.",
    },
  ];
}

function iosGuide(userAgent: string, touchPoints: number): InstallGuide {
  const app = inAppName(userAgent);
  const browserLabel = app ? null : iosBrowserLabel(userAgent);
  const safariPlacement: SharePlacement = isIpad(userAgent, touchPoints) ? "top-bar" : "bottom-bar";
  // In-app browsers can't install. The steps describe Safari after the reader opens it there.
  const placement: SharePlacement = app
    ? safariPlacement
    : browserLabel
      ? "menu"
      : safariPlacement;
  const steps = homeScreenSteps(placement, browserLabel);
  const inAppMessage = app
    ? `${app}'s browser can't add this page to your home screen. Open this page in Safari, then follow these steps.`
    : null;
  return {
    native: false,
    inAppName: app,
    sharePlacement: placement,
    browserLabel,
    steps,
    inAppMessage,
    fallback: inAppMessage,
  };
}

export function buildInstallGuide(userAgent: string, touchPoints: number): InstallGuide {
  const ua = userAgent || "";
  if (isIosDevice(ua, touchPoints)) return iosGuide(ua, touchPoints);

  const app = inAppName(ua);
  if (app) {
    const inAppMessage = `${app}'s browser can't add this page to your home screen. Open it in Chrome, then install it or add it to your home screen.`;
    return {
      native: false,
      inAppName: app,
      sharePlacement: null,
      browserLabel: null,
      steps: [],
      inAppMessage,
      fallback: inAppMessage,
    };
  }

  if (isChromiumBrowser(ua)) {
    const android = /Android/i.test(ua);
    return {
      native: true,
      inAppName: null,
      sharePlacement: null,
      browserLabel: null,
      steps: [],
      inAppMessage: null,
      fallback: android
        ? "Open the browser menu and choose Install app or Add to Home screen."
        : "Look for Install in the address bar, or open the browser menu and choose Install app.",
    };
  }

  if (/Android/i.test(ua)) {
    return {
      native: false,
      inAppName: null,
      sharePlacement: null,
      browserLabel: null,
      steps: [],
      inAppMessage: null,
      fallback:
        "Open the browser menu and choose Add to Home screen or Install app. If that option is missing, open this page in Chrome.",
    };
  }

  const safariMac =
    /Macintosh|Mac OS X/i.test(ua) && !/Chrome|Chromium|Firefox|Edg\//i.test(ua);
  return {
    native: false,
    inAppName: null,
    sharePlacement: null,
    browserLabel: null,
    steps: [],
    inAppMessage: null,
    fallback: safariMac
      ? "In Safari on Mac, choose File → Add to Dock."
      : "Look for Install in your browser’s address bar or menu.",
  };
}

export function installInstructions(userAgent: string, touchPoints: number): string {
  const guide = buildInstallGuide(userAgent, touchPoints);
  if (guide.inAppMessage && guide.steps.length) {
    return `${guide.inAppMessage} ${guide.steps.map((step) => step.detail).join(" ")}`;
  }
  if (guide.steps.length) {
    return guide.steps.map((step) => step.detail).join(" ");
  }
  return guide.fallback ?? "";
}

export function installButtonLabel(userAgent: string): string {
  return /Android|iPhone|iPad|Mobile/i.test(userAgent) ? "Add to home screen" : "Install";
}

export function readInstallMemory(storage: {
  getItem(key: string): string | null;
}): InstallMemory {
  return {
    installed: storage.getItem(INSTALL_INSTALLED_KEY),
    dismissUntil: storage.getItem(INSTALL_DISMISS_KEY),
  };
}

let openInstallPrompt: (() => void) | null = null;

export function registerInstallPromptOpener(opener: () => void): () => void {
  openInstallPrompt = opener;
  return () => {
    if (openInstallPrompt === opener) openInstallPrompt = null;
  };
}

/** Opens the stashed native dialog, or the iOS / fallback guide. */
export function requestInstallPrompt(): void {
  openInstallPrompt?.();
}
