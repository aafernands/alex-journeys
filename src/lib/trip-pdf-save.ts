/**
 * Hand a generated PDF to the device.
 * iPhone Safari, including the installed home-screen app, ignores many
 * anchor downloads. The share sheet (Save to Files) is the path that works.
 */

export type PdfDelivery = "shared" | "downloaded" | "cancelled" | "needs-tap";

export function isIosLike(input: {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}): boolean {
  if (/iPhone|iPad|iPod/i.test(input.userAgent)) return true;
  // iPadOS 13+ uses a desktop Macintosh user agent.
  return input.platform === "MacIntel" && input.maxTouchPoints > 1;
}

function device() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
  };
}

function downloadBlob(blob: Blob, filename: string): boolean {
  try {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return true;
  } catch {
    return false;
  }
}

function sharePayload(file: File, title: string): ShareData {
  return { files: [file], title };
}

/**
 * First attempt, from the menu click. On iOS this calls the share sheet
 * in the same turn as the tap when the browser still has the user gesture.
 * If that gesture has expired, the caller shows a Save or share button.
 */
export async function deliverTripPdf(
  blob: Blob,
  filename: string,
  title: string,
): Promise<PdfDelivery> {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (isIosLike(device()) && typeof navigator.share === "function") {
    const payload = sharePayload(file, title);
    const allowed =
      typeof navigator.canShare !== "function" || navigator.canShare(payload);
    if (allowed) {
      try {
        await navigator.share(payload);
        return "shared";
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return "cancelled";
        }
      }
    }
    return "needs-tap";
  }
  return downloadBlob(blob, filename) ? "downloaded" : "needs-tap";
}

/**
 * Second tap, after the file already exists. Share is started inside the
 * click so iOS still treats it as a user gesture.
 */
export function presentReadyPdf(blob: Blob, filename: string, title: string): void {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (isIosLike(device()) && typeof navigator.share === "function") {
    const payload = sharePayload(file, title);
    const allowed =
      typeof navigator.canShare !== "function" || navigator.canShare(payload);
    if (allowed) {
      void navigator.share(payload).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        downloadBlob(blob, filename);
      });
      return;
    }
  }
  downloadBlob(blob, filename);
}
