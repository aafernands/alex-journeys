"use client";

import { useCallback, useState, type FormEvent } from "react";
import {
  PARTNER_SHOW_WHEN,
  type PartnerShowWhen,
  type TripPlannerConfig,
  type TripPlannerPartner,
} from "@/lib/trip-planner-model";

type Props = {
  config: TripPlannerConfig;
  partners: TripPlannerPartner[];
};

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";

const SHOW_LABEL: Record<PartnerShowWhen, string> = {
  flights: "Flights selected",
  hotel: "Hotel selected",
  car: "Car selected",
  extra: "Extra (always, if extras are on)",
};

function blankPartner(sortOrder: number): TripPlannerPartner {
  return {
    key: "",
    label: "",
    buttonLabel: "",
    blurb: "",
    affiliateUrlTemplate: "https://",
    affiliateUrl: "https://",
    showWhen: "extra",
    enabled: true,
    sortOrder,
    isCore: false,
  };
}

export function TripPlannerForm({ config: initialConfig, partners: initialPartners }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [partners, setPartners] = useState(initialPartners);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const updateConfig = useCallback((partial: Partial<TripPlannerConfig>) => {
    setConfig((current) => ({ ...current, ...partial }));
  }, []);

  const updateStep = useCallback(
    (
      key: keyof TripPlannerConfig["steps"],
      partial: Partial<TripPlannerConfig["steps"]["categories"]>,
    ) => {
      setConfig((current) => ({
        ...current,
        steps: {
          ...current.steps,
          [key]: { ...current.steps[key], ...partial },
        },
      }));
    },
    [],
  );

  const updatePartner = useCallback(
    (index: number, partial: Partial<TripPlannerPartner>) => {
      setPartners((current) =>
        current.map((partner, i) =>
          i === index ? { ...partner, ...partial } : partner,
        ),
      );
    },
    [],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/cms/trip-planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, partners }),
      });
      const data = (await res.json()) as { error?: string; note?: string };
      if (!res.ok) {
        setError(data.error || "Publish failed.");
        return;
      }
      setSuccess(data.note || "Saved.");
    } catch {
      setError("Publish failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="panel space-y-4 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Page
        </h2>
        <label className="block text-sm font-semibold text-heading">
          Title
          <input
            className={fieldClass}
            value={config.title}
            onChange={(event) => updateConfig({ title: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-heading">
          Eyebrow
          <input
            className={fieldClass}
            value={config.label}
            onChange={(event) => updateConfig({ label: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-heading">
          Intro
          <textarea
            className={areaClass}
            rows={3}
            value={config.intro}
            onChange={(event) => updateConfig({ intro: event.target.value })}
          />
        </label>
        <label className="block text-sm font-semibold text-heading">
          Journal eyebrow
          <input
            className={fieldClass}
            value={config.guidesEyebrow}
            onChange={(event) =>
              updateConfig({ guidesEyebrow: event.target.value })
            }
          />
        </label>
        <label className="block text-sm font-semibold text-heading">
          Journal heading
          <input
            className={fieldClass}
            value={config.guidesHeading}
            onChange={(event) =>
              updateConfig({ guidesHeading: event.target.value })
            }
          />
        </label>
        <label className="block text-sm font-semibold text-heading">
          Affiliate disclosure
          <textarea
            className={areaClass}
            rows={3}
            value={config.disclosure}
            onChange={(event) =>
              updateConfig({ disclosure: event.target.value })
            }
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-heading">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={config.flexibleDates}
            onChange={(event) =>
              updateConfig({ flexibleDates: event.target.checked })
            }
          />
          Allow flexible dates
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-heading">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={config.extras}
            onChange={(event) => updateConfig({ extras: event.target.checked })}
          />
          Show extra next steps (insurance, eSIM, experiences)
        </label>
      </section>

      <section className="panel space-y-5 p-5 md:p-6">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Step copy
        </h2>
        {(
          [
            ["categories", "Categories"],
            ["details", "Details"],
            ["review", "Review"],
            ["next", "Next steps"],
          ] as const
        ).map(([key, title]) => (
          <div key={key} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-heading">
              {title} heading
              <input
                className={fieldClass}
                value={config.steps[key].heading}
                onChange={(event) =>
                  updateStep(key, { heading: event.target.value })
                }
              />
            </label>
            <label className="block text-sm font-semibold text-heading sm:col-span-2">
              {title} helper
              <textarea
                className={areaClass}
                rows={2}
                value={config.steps[key].helper}
                onChange={(event) =>
                  updateStep(key, { helper: event.target.value })
                }
              />
            </label>
          </div>
        ))}
        <p className="text-xs text-muted">
          Next-step helper can use {"{destination}"}, {"{dates}"}, and{" "}
          {"{travelers}"}.
        </p>
        <label className="block text-sm font-semibold text-heading">
          Itinerary note
          <textarea
            className={areaClass}
            rows={2}
            value={config.checklistHint}
            onChange={(event) =>
              updateConfig({ checklistHint: event.target.value })
            }
          />
        </label>
        <p className="text-xs text-muted">
          Shown on the itinerary. Guests keep a draft in this browser;
          signed-in readers can save it to their account.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["flights", "Flights chip"],
              ["hotel", "Hotel chip"],
              ["car", "Car chip"],
              ["unsure", "Not sure chip"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm font-semibold text-heading">
              {label}
              <input
                className={fieldClass}
                value={config.chips[key]}
                onChange={(event) =>
                  setConfig((current) => ({
                    ...current,
                    chips: { ...current.chips, [key]: event.target.value },
                  }))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Partners
          </h2>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              setPartners((current) => [
                ...current,
                blankPartner(
                  current.reduce(
                    (max, partner) => Math.max(max, partner.sortOrder),
                    0,
                  ) + 1,
                ),
              ])
            }
          >
            Add partner
          </button>
        </div>
        {partners.map((partner, index) => (
          <fieldset
            key={`${partner.key}-${index}`}
            className="panel space-y-3 p-5 md:p-6"
          >
            <legend className="px-1 text-sm font-semibold text-heading">
              {partner.label || partner.key || `Partner ${index + 1}`}
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-heading">
                Key
                <input
                  className={fieldClass}
                  value={partner.key}
                  onChange={(event) =>
                    updatePartner(index, { key: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-semibold text-heading">
                Sort order
                <input
                  type="number"
                  className={fieldClass}
                  value={partner.sortOrder}
                  onChange={(event) =>
                    updatePartner(index, {
                      sortOrder: event.target.valueAsNumber,
                    })
                  }
                />
              </label>
              <label className="block text-sm font-semibold text-heading">
                Title
                <input
                  className={fieldClass}
                  value={partner.label}
                  onChange={(event) =>
                    updatePartner(index, { label: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm font-semibold text-heading">
                Button
                <input
                  className={fieldClass}
                  value={partner.buttonLabel}
                  onChange={(event) =>
                    updatePartner(index, { buttonLabel: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="block text-sm font-semibold text-heading">
              Blurb
              <input
                className={fieldClass}
                value={partner.blurb}
                onChange={(event) =>
                  updatePartner(index, { blurb: event.target.value })
                }
              />
            </label>
            <label className="block text-sm font-semibold text-heading">
              Show when
              <select
                className={fieldClass}
                value={partner.showWhen}
                onChange={(event) =>
                  updatePartner(index, {
                    showWhen: event.target.value as PartnerShowWhen,
                  })
                }
              >
                {PARTNER_SHOW_WHEN.map((value) => (
                  <option key={value} value={value}>
                    {SHOW_LABEL[value]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-heading">
              Affiliate URL template
              <textarea
                className={areaClass}
                rows={3}
                value={partner.affiliateUrlTemplate}
                onChange={(event) =>
                  updatePartner(index, {
                    affiliateUrlTemplate: event.target.value,
                  })
                }
              />
            </label>
            <label className="block text-sm font-semibold text-heading">
              Fallback affiliate URL
              <input
                className={fieldClass}
                value={partner.affiliateUrl}
                onChange={(event) =>
                  updatePartner(index, { affiliateUrl: event.target.value })
                }
              />
            </label>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold text-heading">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={partner.enabled}
                  onChange={(event) =>
                    updatePartner(index, { enabled: event.target.checked })
                  }
                />
                Enabled
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold text-heading">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--accent)]"
                  checked={partner.isCore}
                  onChange={(event) =>
                    updatePartner(index, { isCore: event.target.checked })
                  }
                />
                Core step (solid button)
              </label>
              <button
                type="button"
                className="btn btn-secondary ml-auto"
                onClick={() =>
                  setPartners((current) =>
                    current.filter((_, i) => i !== index),
                  )
                }
              >
                Remove
              </button>
            </div>
          </fieldset>
        ))}
      </section>

      {error ? (
        <p className="text-sm text-link" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-heading" role="status">
          {success}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "Saving…" : "Save trip planner"}
      </button>
    </form>
  );
}
