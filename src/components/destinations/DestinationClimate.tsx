"use client";

import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  ClimateIcon,
  ClimateMonth,
  ClimateQuality,
  DestinationClimate,
} from "@/data/destinations";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const QUALITY_LABEL: Record<ClimateQuality, string> = {
  best: "Best",
  good: "Good",
  mixed: "Mixed",
  poor: "Poor",
};

const QUALITY_CHIP: Record<ClimateQuality, string> = {
  best: "border-accent/40 bg-accent/15 text-accent-deep dark:text-accent",
  good: "border-steel/35 bg-steel/10 text-steel",
  mixed: "border-border-strong bg-surface text-muted",
  poor: "border-border bg-sand/40 text-muted dark:bg-sand/20",
};

function WeatherIcon({
  icon,
  className,
}: {
  icon: ClimateIcon;
  className?: string;
}) {
  const props = { className, strokeWidth: 1.75, "aria-hidden": true as const };
  switch (icon) {
    case "sun":
      return <Sun {...props} />;
    case "cloud":
      return <Cloud {...props} />;
    case "partly-cloudy":
      return <CloudSun {...props} />;
    case "rain":
      return <CloudRain {...props} />;
    case "snow":
      return <CloudSnow {...props} />;
    case "storm":
      return <CloudLightning {...props} />;
  }
}

function formatTemp(avgC: number, unit: "C" | "F"): string {
  if (unit === "C") return `${Math.round(avgC)}°C`;
  return `${Math.round((avgC * 9) / 5 + 32)}°F`;
}

type Props = {
  destinationName: string;
  climate: DestinationClimate;
};

export function DestinationClimate({ destinationName, climate }: Props) {
  const [unit, setUnit] = useState<"C" | "F">("C");

  const months = useMemo(() => {
    const byMonth = new Map<number, ClimateMonth>();
    for (const m of climate.months) byMonth.set(m.month, m);
    return Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return byMonth.get(month) ?? null;
    });
  }, [climate.months]);

  return (
    <section
      className="mt-12"
      aria-labelledby="destination-climate-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2
            id="destination-climate-heading"
            className="font-display text-title text-heading"
          >
            Weather in {destinationName}
          </h2>
          <p className="mt-1 text-xs text-muted">
            Typical monthly averages, not a live forecast
          </p>
        </div>

        <div
          className="inline-flex rounded-full border border-border bg-surface-soft p-0.5"
          role="group"
          aria-label="Temperature unit"
        >
          {(["C", "F"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              aria-pressed={unit === u}
              className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide transition ${
                unit === u
                  ? "bg-heading text-on-solid shadow-sm"
                  : "text-muted hover:text-heading"
              }`}
            >
              °{u}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-[0.95rem] leading-relaxed text-text sm:text-base">
        {climate.summary}
      </p>
      <p className="mt-3 text-sm font-medium text-heading">
        <span className="text-muted">Best time to visit:</span>{" "}
        {climate.bestTime}
      </p>

      <ul className="mt-6 flex gap-2.5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0 md:grid-cols-4 lg:grid-cols-6 [&::-webkit-scrollbar]:hidden">
        {months.map((m, index) => {
          if (!m) return null;
          const name = MONTH_NAMES[index];
          return (
            <li
              key={m.month}
              className="flex w-[7.25rem] shrink-0 flex-col items-center rounded-xl border border-border bg-surface-soft px-2.5 py-3 text-center shadow-sm sm:w-auto"
            >
              <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                {name}
              </span>
              <WeatherIcon
                icon={m.icon}
                className="mt-2.5 h-6 w-6 text-accent"
              />
              <span className="mt-2 text-xs leading-snug text-text">
                {m.label}
              </span>
              <span className="mt-1.5 font-display text-lg font-semibold tabular-nums text-heading">
                {formatTemp(m.avgC, unit)}
              </span>
              <span
                className={`mt-2 rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${QUALITY_CHIP[m.quality]}`}
              >
                {QUALITY_LABEL[m.quality]}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
