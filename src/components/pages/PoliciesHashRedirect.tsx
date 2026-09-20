"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Old /policies#anchors used to live on a single mega-page. Map them to the
 * split routes so existing links and Google Console bookmarks keep working.
 * Hash is client-only — Next redirects cannot match it.
 */
const HASH_MAP: Record<string, string> = {
  privacy: "/privacy",
  "google-oauth": "/privacy#google-oauth",
  cookies: "/privacy#cookies",
  "third-parties": "/privacy#third-parties",
  rights: "/privacy#rights",
  terms: "/terms",
  comments: "/terms#comments",
  monetization: "/affiliate-disclosure",
};

export function PoliciesHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, "").toLowerCase();
    if (!raw) return;
    const dest = HASH_MAP[raw];
    if (dest) router.replace(dest);
  }, [router]);

  return null;
}
