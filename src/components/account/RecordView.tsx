"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import type { HistoryKind } from "@/lib/reading-history";

const SKIP_MS = 10 * 60 * 1000;

/**
 * Adds this story, guide, or place to the signed-in reader's History in My
 * Journey. Renders nothing. Signed-out visits send no request, and a page
 * seen again within a few minutes in the same tab is skipped.
 */
export function RecordView({ kind, slug }: { kind: HistoryKind; slug: string }) {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const key = `aj:viewed:${kind}:${slug}`;
    try {
      const last = Number(window.sessionStorage.getItem(key) || 0);
      if (last && Date.now() - last < SKIP_MS) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage blocked: still record; the server skips quick repeats.
    }
    void fetch("/api/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, slug }),
      keepalive: true,
    }).catch(() => {});
  }, [status, kind, slug]);

  return null;
}
