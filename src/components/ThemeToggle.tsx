"use client";

import { Monitor, Moon, Sun } from "lucide-react";
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

function persistPreference(next: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
}

function useThemePreference() {
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

  const setTheme = useCallback((next: ThemePreference) => {
    persistPreference(next);
    setPreference(next);
  }, []);

  const cycle = useCallback(() => {
    setPreference((current) => {
      const idx = CYCLE.indexOf(current);
      const next = CYCLE[(idx + 1) % CYCLE.length] ?? "system";
      persistPreference(next);
      return next;
    });
  }, []);

  const isDark =
    preference === "dark" || (preference === "system" && systemDark);

  return { preference, systemDark, mounted, isDark, setTheme, cycle };
}

/** Compact cycle button for desktop header. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { preference, mounted, isDark, cycle } = useThemePreference();

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

const APPEARANCE_OPTIONS: {
  value: ThemePreference;
  label: string;
  Icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "Device settings", Icon: Monitor },
];

/** Labeled Light / Dark / Device settings control for the mobile drawer. */
export function ThemeAppearanceControl({
  className = "",
}: {
  className?: string;
}) {
  const { preference, mounted, setTheme } = useThemePreference();
  const selected = mounted ? preference : "system";

  return (
    <div className={className}>
      <p
        id="appearance-label"
        className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted"
      >
        Appearance
      </p>
      <div
        role="radiogroup"
        aria-labelledby="appearance-label"
        className="grid grid-cols-3 gap-1 rounded-xl bg-surface-soft p-1"
      >
        {APPEARANCE_OPTIONS.map(({ value, label, Icon }) => {
          const isSelected = selected === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(value)}
              className={`inline-flex flex-col items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-center text-[11px] font-semibold leading-tight transition ${
                isSelected
                  ? "bg-bg text-heading shadow-sm ring-1 ring-border-strong"
                  : "text-text hover:text-heading"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
