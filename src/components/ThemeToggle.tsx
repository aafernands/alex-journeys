"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemePreference,
  msUntilThemeBoundary,
  readColorScheme,
  readStoredTheme,
  resolveThemeDark,
  writeStoredTheme,
  type ThemePreference,
} from "@/lib/theme";

export type { ThemePreference };

const CYCLE: ThemePreference[] = ["light", "dark", "system"];

type ThemeSnapshot = {
  preference: ThemePreference;
  isDark: boolean;
};

const SERVER_SNAPSHOT: ThemeSnapshot = { preference: "system", isDark: false };

let clientSnapshot: ThemeSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let stopListening: (() => void) | null = null;

function readSnapshot(): ThemeSnapshot {
  const preference = readStoredTheme();
  const isDark = resolveThemeDark(
    preference,
    readColorScheme(
      typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : null,
    ),
    new Date().getHours(),
  );
  if (clientSnapshot.preference === preference && clientSnapshot.isDark === isDark) {
    return clientSnapshot;
  }
  clientSnapshot = { preference, isDark };
  return clientSnapshot;
}

function emitTheme() {
  applyThemePreference(readStoredTheme());
  for (const listener of listeners) listener();
}

function ensureListening() {
  if (stopListening || typeof window === "undefined") return;
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY || event.key === null) emitTheme();
  };
  window.addEventListener(THEME_CHANGE_EVENT, emitTheme);
  window.addEventListener("storage", onStorage);

  const unlistenMedia: Array<() => void> = [];
  const watch = (query: string) => {
    try {
      const mq = window.matchMedia(query);
      if (typeof mq.addEventListener !== "function") return;
      mq.addEventListener("change", emitTheme);
      unlistenMedia.push(() => mq.removeEventListener("change", emitTheme));
    } catch {
      /* matchMedia unsupported. The clock fallback still runs. */
    }
  };
  watch("(prefers-color-scheme: dark)");
  watch("(prefers-color-scheme: light)");

  const onVisible = () => {
    if (document.visibilityState === "visible") emitTheme();
  };
  document.addEventListener("visibilitychange", onVisible);

  let timer = 0;
  const arm = () => {
    timer = window.setTimeout(() => {
      emitTheme();
      arm();
    }, msUntilThemeBoundary(new Date()));
  };
  arm();

  stopListening = () => {
    window.removeEventListener(THEME_CHANGE_EVENT, emitTheme);
    window.removeEventListener("storage", onStorage);
    for (const stop of unlistenMedia) stop();
    document.removeEventListener("visibilitychange", onVisible);
    window.clearTimeout(timer);
    stopListening = null;
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureListening();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stopListening?.();
  };
}

export function useThemePreference() {
  const snap = useSyncExternalStore(subscribe, readSnapshot, () => SERVER_SNAPSHOT);

  useLayoutEffect(() => {
    applyThemePreference(readStoredTheme());
  }, [snap]);

  const setTheme = useCallback((next: ThemePreference) => {
    writeStoredTheme(next);
  }, []);

  const cycle = useCallback(() => {
    const current = readStoredTheme();
    const idx = CYCLE.indexOf(current);
    const next = CYCLE[(idx + 1) % CYCLE.length] ?? "system";
    writeStoredTheme(next);
  }, []);

  return {
    preference: snap.preference,
    isDark: snap.isDark,
    setTheme,
    cycle,
  };
}

/** Compact cycle button for the desktop header. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preference, isDark, cycle } = useThemePreference();

  const label =
    preference === "light"
      ? "Switch to dark mode"
      : preference === "dark"
        ? "Switch to automatic"
        : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={cycle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft ${className}`}
      aria-label={label}
      title={preference === "system" ? "Theme: Automatic" : `Theme: ${preference}`}
    >
      {isDark ? (
        <Moon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}
