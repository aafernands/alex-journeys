"use client";

import { useEffect } from "react";

/**
 * Resets the window to the top when mounted. Used in Stays loading screens so a
 * tap from mid-page (e.g. a room's Select button) doesn't leave the view at the
 * footer while the next page loads.
 */
export function StayScrollTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, []);
  return null;
}
