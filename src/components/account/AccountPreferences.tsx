"use client";

import { AddToHomeScreenButton, useInstallOffer } from "@/components/AddToHomeScreenButton";
import { useThemePreference, type ThemePreference } from "@/components/ThemeToggle";
import { Monitor, Moon, Sun } from "lucide-react";

const OPTIONS: {
  value: ThemePreference;
  label: string;
  hint?: string;
  Icon: typeof Sun;
}[] = [
  {
    value: "system",
    label: "Automatic",
    hint: "Matches your device. Uses the time of day if it has no preference.",
    Icon: Monitor,
  },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function AccountPreferences() {
  const { preference, setTheme } = useThemePreference();
  const offerInstall = useInstallOffer();

  return (
    <>
      <section className="panel p-6 md:p-8" aria-labelledby="settings-appearance">
        <h2
          id="settings-appearance"
          className="font-display text-2xl font-bold text-heading"
        >
          Appearance
        </h2>
        <p className="mt-1 text-sm text-muted">
          Choose a look for Alex Journeys on this device.
        </p>
        <div
          role="radiogroup"
          aria-labelledby="settings-appearance"
          className="mt-5 grid gap-2"
        >
          {OPTIONS.map(({ value, label, hint, Icon }) => {
            const isSelected = preference === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setTheme(value)}
                className={`flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                  isSelected
                    ? "border-accent bg-surface-soft text-heading"
                    : "border-border bg-white text-text hover:bg-surface-soft"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{label}</span>
                  {hint ? (
                    <span className="mt-0.5 block text-xs font-normal leading-snug text-muted">
                      {hint}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {offerInstall ? (
        <section className="panel p-6 md:p-8" aria-labelledby="settings-app">
          <h2 id="settings-app" className="font-display text-2xl font-bold text-heading">
            App
          </h2>
          <p className="mt-1 text-sm text-muted">
            Keep a shortcut to your trips and stories.
          </p>
          <AddToHomeScreenButton className="mt-4 flex min-h-11 w-full items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-left text-sm font-semibold text-heading transition hover:bg-surface-soft" />
        </section>
      ) : null}
    </>
  );
}
