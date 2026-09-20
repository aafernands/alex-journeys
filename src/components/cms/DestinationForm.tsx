"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ClimateIcon,
  ClimateMonth,
  ClimateQuality,
  DestinationCountry,
  DestinationMapPin,
} from "@/data/destinations";
import {
  CLIMATE_ICON_OPTIONS,
  CLIMATE_QUALITY_OPTIONS,
  DEFAULT_CLIMATE_MONTHS,
} from "@/lib/cms/validate-destination";

export type ContinentOption = { id: string; name: string };

export type DestinationFormInitial = {
  country: DestinationCountry;
  continentId: string;
};

type PinDraft = {
  name: string;
  lat: string;
  lng: string;
  note: string;
};

type MonthDraft = {
  month: number;
  label: string;
  icon: ClimateIcon;
  avgC: string;
  quality: ClimateQuality;
};

type Props = {
  mode: "create" | "edit";
  continents: ContinentOption[];
  initial?: DestinationFormInitial;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function monthDraftsFrom(
  months?: ClimateMonth[],
): MonthDraft[] {
  const source = months?.length === 12 ? months : DEFAULT_CLIMATE_MONTHS;
  return [...source]
    .sort((a, b) => a.month - b.month)
    .map((m) => ({
      month: m.month,
      label: m.label,
      icon: m.icon,
      avgC: String(m.avgC),
      quality: m.quality,
    }));
}

function pinDraftsFrom(pins?: DestinationMapPin[]): PinDraft[] {
  if (!pins?.length) return [];
  return pins.map((p) => ({
    name: p.name,
    lat: String(p.lat),
    lng: String(p.lng),
    note: p.note ?? "",
  }));
}

const fieldClass =
  "mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const areaClass =
  "mt-2 w-full rounded-lg border border-border bg-white px-4 py-3 text-sm text-heading placeholder:text-muted transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25";
const selectClass = fieldClass;

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
];

export function DestinationForm({ mode, continents, initial }: Props) {
  const router = useRouter();
  const c = initial?.country;

  const [name, setName] = useState(c?.name ?? "");
  const [slug, setSlug] = useState(c?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [continentChoice, setContinentChoice] = useState(
    initial?.continentId ?? continents[0]?.id ?? "europe",
  );
  const [newContinentId, setNewContinentId] = useState("");
  const [newContinentName, setNewContinentName] = useState("");
  const [region, setRegion] = useState(c?.region ?? "");
  const [blurb, setBlurb] = useState(c?.blurb ?? "");
  const [image, setImage] = useState(c?.image ?? "");
  const [imageAlt, setImageAlt] = useState(c?.imageAlt ?? "");
  const [tripLabel, setTripLabel] = useState(c?.tripLabel ?? "");
  const [featuredPostSlug, setFeaturedPostSlug] = useState(
    c?.featuredPostSlug ?? "",
  );
  const [highlightsText, setHighlightsText] = useState(
    (c?.highlights ?? []).join("\n"),
  );

  const [centerLat, setCenterLat] = useState(
    c?.map?.center?.[0] !== undefined ? String(c.map.center[0]) : "",
  );
  const [centerLng, setCenterLng] = useState(
    c?.map?.center?.[1] !== undefined ? String(c.map.center[1]) : "",
  );
  const [zoom, setZoom] = useState(
    c?.map?.zoom !== undefined ? String(c.map.zoom) : "6",
  );
  const [pins, setPins] = useState<PinDraft[]>(pinDraftsFrom(c?.map?.pins));

  const [climateSummary, setClimateSummary] = useState(
    c?.climate?.summary ?? "",
  );
  const [bestTime, setBestTime] = useState(c?.climate?.bestTime ?? "");
  const [months, setMonths] = useState<MonthDraft[]>(
    monthDraftsFrom(c?.climate?.months),
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    commitUrl: string;
    note: string;
    slug: string;
  } | null>(null);
  const [pending, setPending] = useState(false);

  const derivedSlug = useMemo(() => slugify(name), [name]);
  const usingNewContinent = continentChoice === "__new__";

  return (
    <form
      className="panel space-y-8 p-6 md:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setPending(true);

        const finalSlug = slugTouched ? slug : derivedSlug || slug;
        const continentId = usingNewContinent
          ? newContinentId.trim().toLowerCase()
          : continentChoice;
        const continentMeta = continents.find((x) => x.id === continentId);
        const continentName = usingNewContinent
          ? newContinentName.trim()
          : continentMeta?.name || "";

        const pinPayload = pins
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            lat: Number(p.lat),
            lng: Number(p.lng),
            ...(p.note.trim() ? { note: p.note.trim() } : {}),
          }));

        const hasMap =
          centerLat.trim() !== "" &&
          centerLng.trim() !== "" &&
          zoom.trim() !== "";

        const hasClimate =
          climateSummary.trim() !== "" ||
          bestTime.trim() !== "" ||
          months.some(
            (m) =>
              m.label.trim() !== "" ||
              m.avgC.trim() !== "" ||
              m.icon ||
              m.quality,
          );

        const country: Record<string, unknown> = {
          slug: finalSlug,
          name: name.trim(),
          region: region.trim(),
          continent: continentName || name.trim(),
          blurb: blurb.trim(),
          image: image.trim(),
          imageAlt: imageAlt.trim() || name.trim(),
          tripLabel: tripLabel.trim() || undefined,
          featuredPostSlug: featuredPostSlug.trim() || undefined,
          highlights: highlightsText
            .split("\n")
            .map((h) => h.trim())
            .filter(Boolean),
        };

        if (c?.coverImages?.length) {
          country.coverImages = c.coverImages;
        }

        if (hasMap) {
          country.map = {
            center: [Number(centerLat), Number(centerLng)],
            zoom: Number(zoom),
            pins: pinPayload,
          };
        }

        if (hasClimate && climateSummary.trim() && bestTime.trim()) {
          country.climate = {
            summary: climateSummary.trim(),
            bestTime: bestTime.trim(),
            months: months.map((m) => ({
              month: m.month,
              label: m.label.trim(),
              icon: m.icon,
              avgC: Number(m.avgC),
              quality: m.quality,
            })),
          };
        }

        try {
          const res = await fetch("/api/cms/destinations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              country,
              continentId,
              continentName: continentName || undefined,
              update: mode === "edit",
            }),
          });
          const data = (await res.json()) as {
            error?: string;
            commitUrl?: string;
            note?: string;
            slug?: string;
            ok?: boolean;
          };
          if (!res.ok || !data.ok) {
            setError(data.error || "Publish failed.");
            setPending(false);
            return;
          }
          setSuccess({
            commitUrl: data.commitUrl || "",
            note: data.note || "Published.",
            slug: data.slug || finalSlug,
          });
          setPending(false);
          router.refresh();
        } catch {
          setError("Network error. Try again.");
          setPending(false);
        }
      }}
    >
      <section className="space-y-5">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
          Core details
        </h2>

        <div>
          <label htmlFor="dest-name" className="text-sm font-semibold text-heading">
            Name <span className="text-accent">*</span>
          </label>
          <input
            id="dest-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            required
            className={fieldClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-slug" className="text-sm font-semibold text-heading">
              Slug <span className="text-accent">*</span>
            </label>
            <input
              id="dest-slug"
              value={slugTouched ? slug : derivedSlug || slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              disabled={mode === "edit"}
              className={`${fieldClass} disabled:bg-surface-soft`}
            />
            <p className="mt-1 text-xs text-muted">
              kebab-case · becomes /destinations/{"{slug}"}
            </p>
          </div>
          <div>
            <label htmlFor="dest-region" className="text-sm font-semibold text-heading">
              Region <span className="text-accent">*</span>
            </label>
            <input
              id="dest-region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              required
              placeholder="e.g. North America"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="dest-continent" className="text-sm font-semibold text-heading">
            Continent <span className="text-accent">*</span>
          </label>
          <select
            id="dest-continent"
            value={continentChoice}
            onChange={(e) => setContinentChoice(e.target.value)}
            className={selectClass}
          >
            {continents.map((cont) => (
              <option key={cont.id} value={cont.id}>
                {cont.name} ({cont.id})
              </option>
            ))}
            <option value="__new__">+ New continent…</option>
          </select>
        </div>

        {usingNewContinent ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="dest-new-cont-id" className="text-sm font-semibold text-heading">
                New continent id <span className="text-accent">*</span>
              </label>
              <input
                id="dest-new-cont-id"
                value={newContinentId}
                onChange={(e) =>
                  setNewContinentId(e.target.value.toLowerCase())
                }
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="e.g. asia"
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="dest-new-cont-name" className="text-sm font-semibold text-heading">
                New continent name <span className="text-accent">*</span>
              </label>
              <input
                id="dest-new-cont-name"
                value={newContinentName}
                onChange={(e) => setNewContinentName(e.target.value)}
                required
                placeholder="e.g. Asia"
                className={fieldClass}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label htmlFor="dest-blurb" className="text-sm font-semibold text-heading">
            Blurb <span className="text-accent">*</span>
          </label>
          <textarea
            id="dest-blurb"
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            required
            rows={3}
            maxLength={600}
            className={areaClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-image" className="text-sm font-semibold text-heading">
              Image URL <span className="text-accent">*</span>
            </label>
            <input
              id="dest-image"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
              placeholder="https://…"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-image-alt" className="text-sm font-semibold text-heading">
              Image alt <span className="text-accent">*</span>
            </label>
            <input
              id="dest-image-alt"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              required
              className={fieldClass}
            />
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-trip" className="text-sm font-semibold text-heading">
              Trip label
            </label>
            <input
              id="dest-trip"
              value={tripLabel}
              onChange={(e) => setTripLabel(e.target.value)}
              placeholder="e.g. 1 week"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-featured" className="text-sm font-semibold text-heading">
              Featured post slug
            </label>
            <input
              id="dest-featured"
              value={featuredPostSlug}
              onChange={(e) => setFeaturedPostSlug(e.target.value.toLowerCase())}
              placeholder="kebab-case blog slug"
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="dest-highlights" className="text-sm font-semibold text-heading">
            Highlights
          </label>
          <textarea
            id="dest-highlights"
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
            rows={5}
            placeholder={"One highlight per line"}
            className={areaClass}
          />
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Map
          </h2>
          <p className="text-xs text-muted">
            Optional. Leave center empty to omit the map.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="dest-center-lat" className="text-sm font-semibold text-heading">
              Center lat
            </label>
            <input
              id="dest-center-lat"
              type="number"
              step="any"
              value={centerLat}
              onChange={(e) => setCenterLat(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-center-lng" className="text-sm font-semibold text-heading">
              Center lng
            </label>
            <input
              id="dest-center-lng"
              type="number"
              step="any"
              value={centerLng}
              onChange={(e) => setCenterLng(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-zoom" className="text-sm font-semibold text-heading">
              Zoom
            </label>
            <input
              id="dest-zoom"
              type="number"
              min={1}
              max={20}
              value={zoom}
              onChange={(e) => setZoom(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-heading">Pins</p>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() =>
                setPins((prev) => [
                  ...prev,
                  { name: "", lat: "", lng: "", note: "" },
                ])
              }
            >
              Add pin
            </button>
          </div>
          {pins.length === 0 ? (
            <p className="text-xs text-muted">No pins yet.</p>
          ) : (
            pins.map((pin, idx) => (
              <div
                key={idx}
                className="grid gap-3 rounded-lg border border-border bg-surface-soft/40 p-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                <input
                  aria-label={`Pin ${idx + 1} name`}
                  placeholder="Name"
                  value={pin.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPins((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, name: v } : p)),
                    );
                  }}
                  className={fieldClass + " mt-0"}
                />
                <input
                  aria-label={`Pin ${idx + 1} lat`}
                  placeholder="Lat"
                  type="number"
                  step="any"
                  value={pin.lat}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPins((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, lat: v } : p)),
                    );
                  }}
                  className={fieldClass + " mt-0"}
                />
                <input
                  aria-label={`Pin ${idx + 1} lng`}
                  placeholder="Lng"
                  type="number"
                  step="any"
                  value={pin.lng}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPins((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, lng: v } : p)),
                    );
                  }}
                  className={fieldClass + " mt-0"}
                />
                <input
                  aria-label={`Pin ${idx + 1} note`}
                  placeholder="Note"
                  value={pin.note}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPins((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, note: v } : p)),
                    );
                  }}
                  className={fieldClass + " mt-0"}
                />
                <button
                  type="button"
                  className="btn btn-secondary text-xs"
                  onClick={() =>
                    setPins((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Climate
          </h2>
          <p className="text-xs text-muted">
            Optional. Fill summary + best time + 12 months to include.
          </p>
        </div>
        <div>
          <label htmlFor="dest-climate-summary" className="text-sm font-semibold text-heading">
            Summary
          </label>
          <textarea
            id="dest-climate-summary"
            value={climateSummary}
            onChange={(e) => setClimateSummary(e.target.value)}
            rows={2}
            className={areaClass}
          />
        </div>
        <div>
          <label htmlFor="dest-best-time" className="text-sm font-semibold text-heading">
            Best time
          </label>
          <input
            id="dest-best-time"
            value={bestTime}
            onChange={(e) => setBestTime(e.target.value)}
            placeholder="e.g. June–August"
            className={fieldClass}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="py-2 pr-2 font-semibold">Mo</th>
                <th className="py-2 pr-2 font-semibold">Label</th>
                <th className="py-2 pr-2 font-semibold">Icon</th>
                <th className="py-2 pr-2 font-semibold">Avg °C</th>
                <th className="py-2 font-semibold">Quality</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m, idx) => (
                <tr key={m.month} className="border-b border-border/60">
                  <td className="py-2 pr-2 font-mono text-xs text-muted">
                    {MONTH_NAMES[m.month - 1]}
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      aria-label={`Month ${m.month} label`}
                      value={m.label}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMonths((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, label: v } : row,
                          ),
                        );
                      }}
                      className={fieldClass + " mt-0 min-h-9"}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <select
                      aria-label={`Month ${m.month} icon`}
                      value={m.icon}
                      onChange={(e) => {
                        const v = e.target.value as ClimateIcon;
                        setMonths((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, icon: v } : row,
                          ),
                        );
                      }}
                      className={selectClass + " mt-0 min-h-9"}
                    >
                      {CLIMATE_ICON_OPTIONS.map((icon) => (
                        <option key={icon} value={icon}>
                          {icon}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      aria-label={`Month ${m.month} avgC`}
                      type="number"
                      step="any"
                      value={m.avgC}
                      onChange={(e) => {
                        const v = e.target.value;
                        setMonths((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, avgC: v } : row,
                          ),
                        );
                      }}
                      className={fieldClass + " mt-0 min-h-9"}
                    />
                  </td>
                  <td className="py-2">
                    <select
                      aria-label={`Month ${m.month} quality`}
                      value={m.quality}
                      onChange={(e) => {
                        const v = e.target.value as ClimateQuality;
                        setMonths((prev) =>
                          prev.map((row, i) =>
                            i === idx ? { ...row, quality: v } : row,
                          ),
                        );
                      }}
                      className={selectClass + " mt-0 min-h-9"}
                    >
                      {CLIMATE_QUALITY_OPTIONS.map((q) => (
                        <option key={q} value={q}>
                          {q}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <div className="panel-soft rounded-lg border border-border p-4 text-sm text-text">
          <p className="font-semibold text-heading">Published</p>
          <p className="mt-1">{success.note}</p>
          {success.commitUrl ? (
            <p className="mt-2">
              <a
                href={success.commitUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link underline-offset-2 hover:text-accent hover:underline"
              >
                View commit on GitHub
              </a>
              {" · "}
              <a
                href={`/destinations/${success.slug}`}
                className="text-link underline-offset-2 hover:text-accent hover:underline"
              >
                Open /destinations/{success.slug}
              </a>
              {" (after deploy)"}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary disabled:opacity-60"
        >
          {pending
            ? "Publishing…"
            : mode === "edit"
              ? "Update destination"
              : "Publish destination"}
        </button>
        <a href="/cms/destinations" className="btn btn-secondary">
          Back to destinations
        </a>
      </div>
    </form>
  );
}
