export const INSTALL_PROMPT_SEEN = "aj.home-screen-prompt-seen";

export function isInstallPromptPage(pathname: string): boolean {
  return !/^\/(cms|api|account|login|signup|forgot-password|reset-password)(\/|$)/.test(pathname)
    && !/\/(checkout|confirmation)(\/|$)/.test(pathname);
}

export function installInstructions(userAgent: string, touchPoints: number): string {
  if (/iPad|iPhone|iPod/.test(userAgent) || /Macintosh/.test(userAgent) && touchPoints > 1) {
    return "Open the Share menu in your browser, choose Add to Home Screen, then tap Add. If that option is missing, open this page in Safari.";
  }
  if (/Android/i.test(userAgent)) {
    return "Open your browser menu and choose Add to Home screen or Install app. If neither option appears, try opening this site in Chrome.";
  }
  return "Look for Install in your browser’s address bar or menu. In Safari on Mac, choose File → Add to Dock.";
}
