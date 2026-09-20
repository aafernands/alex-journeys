"use client";

import { Moon, Sun } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
const CYCLE: ThemePreference[] = ["light", "dark", "system"];

function getSystemDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolveDark(preference: ThemePreference): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  return getSystemDark();
}

function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (resolveDark(preference)) {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const pref = readPreference();
    setPreference(pref);
    setSystemDark(getSystemDark());
    applyTheme(pref);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      setSystemDark(mq.matches);
      if (preference === "system") applyTheme("system");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mounted, preference]);

  const cycle = useCallback(() => {
    setPreference((current) => {
      const idx = CYCLE.indexOf(current);
      const next = CYCLE[(idx + 1) % CYCLE.length] ?? "system";
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      applyTheme(next);
      return next;
    });
  }, []);

  const isDark =
    preference === "dark" || (preference === "system" && systemDark);

  const label =
    preference === "light"
      ? "Switch to dark mode"
      : preference === "dark"
        ? "Switch to system theme"
        : "Switch to light mode";

  return (
    <button
      type="button"
      onClick={cycle}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg text-heading transition hover:bg-surface-soft ${className}`}
      aria-label={label}
      title={
        preference === "system" ? "Theme: system" : `Theme: ${preference}`
      }
    >
      {/* Avoid hydration mismatch: show sun until mounted */}
      {mounted && isDark ? (
        <Moon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      )}
    </button>
  );
}
