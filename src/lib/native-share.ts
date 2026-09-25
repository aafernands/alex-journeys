/** Cancellation is intentional: never copy a link after a dismissed share sheet. */
export async function nativeShare(data: ShareData, device: Pick<Navigator, "share"> = navigator): Promise<"shared" | "cancelled" | "unavailable"> {
  if (typeof device.share !== "function") return "unavailable";
  try {
    await device.share(data);
    return "shared";
  } catch (error) {
    return error instanceof Error && error.name === "AbortError" ? "cancelled" : "unavailable";
  }
}
