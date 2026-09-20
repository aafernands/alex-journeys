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

type ItineraryDayDraft = {
  day: string;
  title: string;
  detail: string;
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

function itineraryDayDraftsFrom(
  days?: { day: string; title: string; detail: string }[],
): ItineraryDayDraft[] {
  if (!days?.length) return [];
  return days.map((d) => ({
    day: d.day,
    title: d.title,
    detail: d.detail,
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
  const [city, setCity] = useState(c?.city ?? "");
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

  const [itineraryTitle, setItineraryTitle] = useState(
    c?.itinerary?.title ?? "",
  );
  const [itineraryDays, setItineraryDays] = useState<ItineraryDayDraft[]>(
    itineraryDayDraftsFrom(c?.itinerary?.days),
  );

  const [qfBestTime, setQfBestTime] = useState(
    c?.quickFacts?.bestTime ?? "",
  );
  const [qfCurrency, setQfCurrency] = useState(c?.quickFacts?.currency ?? "");
  const [qfLanguage, setQfLanguage] = useState(c?.quickFacts?.language ?? "");
  const [qfPlugs, setQfPlugs] = useState(c?.quickFacts?.plugs ?? "");
  const [qfTapWater, setQfTapWater] = useState(c?.quickFacts?.tapWater ?? "");
  const [qfTimezone, setQfTimezone] = useState(c?.quickFacts?.timezone ?? "");

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
          city: city.trim() || undefined,
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

        const quickFacts: Record<string, string> = {};
        if (qfBestTime.trim()) quickFacts.bestTime = qfBestTime.trim();
        if (qfCurrency.trim()) quickFacts.currency = qfCurrency.trim();
        if (qfLanguage.trim()) quickFacts.language = qfLanguage.trim();
        if (qfPlugs.trim()) quickFacts.plugs = qfPlugs.trim();
        if (qfTapWater.trim()) quickFacts.tapWater = qfTapWater.trim();
        if (qfTimezone.trim()) quickFacts.timezone = qfTimezone.trim();
        if (Object.keys(quickFacts).length) {
          country.quickFacts = quickFacts;
        }

        const dayPayload = itineraryDays
          .map((d) => ({
            day: d.day.trim(),
            title: d.title.trim(),
            detail: d.detail.trim(),
          }))
          .filter((d) => d.day || d.title || d.detail);
        if (dayPayload.length > 0 || itineraryTitle.trim()) {
          country.itinerary = {
            ...(itineraryTitle.trim()
              ? { title: itineraryTitle.trim() }
              : {}),
            days: dayPayload,
          };
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

        <div className="grid gap-5 sm:grid-cols-2">
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
          <div>
            <label htmlFor="dest-city" className="text-sm font-semibold text-heading">
              City / place
            </label>
            <input
              id="dest-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              placeholder="e.g. Reykjavík, Toronto"
              className={fieldClass}
            />
            <p className="mt-1 text-xs text-muted">
              Shown on homepage photo cards under the country name.
            </p>
          </div>
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
              kebab-case · becomes /{"{slug}"}
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
              type="text"
              inputMode="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              required
              placeholder="/media/… or https://…"
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
            Suggested itinerary
          </h2>
          <p className="text-xs text-muted">
            Optional. From real trip notes only — omit empty days to hide the
            block on the page.
          </p>
        </div>
        <div>
          <label
            htmlFor="dest-itinerary-title"
            className="text-sm font-semibold text-heading"
          >
            Itinerary title
          </label>
          <input
            id="dest-itinerary-title"
            value={itineraryTitle}
            onChange={(e) => setItineraryTitle(e.target.value)}
            placeholder='e.g. "48 hours in Toronto" or "A week in Iceland"'
            className={fieldClass}
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-heading">Days</p>
            <button
              type="button"
              className="btn btn-secondary text-xs"
              onClick={() =>
                setItineraryDays((prev) => [
                  ...prev,
                  {
                    day: `Day ${prev.length + 1}`,
                    title: "",
                    detail: "",
                  },
                ])
              }
            >
              Add day
            </button>
          </div>
          {itineraryDays.length === 0 ? (
            <p className="text-xs text-muted">No itinerary days yet.</p>
          ) : (
            itineraryDays.map((row, idx) => (
              <div
                key={idx}
                className="space-y-3 rounded-lg border border-border bg-surface-soft/40 p-3"
              >
                <div className="grid gap-3 sm:grid-cols-[8rem_1fr_auto]">
                  <input
                    aria-label={`Itinerary day ${idx + 1} label`}
                    placeholder="Day 1"
                    value={row.day}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItineraryDays((prev) =>
                        prev.map((d, i) =>
                          i === idx ? { ...d, day: v } : d,
                        ),
                      );
                    }}
                    className={fieldClass + " mt-0"}
                  />
                  <input
                    aria-label={`Itinerary day ${idx + 1} title`}
                    placeholder="Title"
                    value={row.title}
                    onChange={(e) => {
                      const v = e.target.value;
                      setItineraryDays((prev) =>
                        prev.map((d, i) =>
                          i === idx ? { ...d, title: v } : d,
                        ),
                      );
                    }}
                    className={fieldClass + " mt-0"}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary text-xs"
                    onClick={() =>
                      setItineraryDays((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                  >
                    Remove
                  </button>
                </div>
                <textarea
                  aria-label={`Itinerary day ${idx + 1} detail`}
                  placeholder="Short detail from the real trip"
                  value={row.detail}
                  rows={2}
                  onChange={(e) => {
                    const v = e.target.value;
                    setItineraryDays((prev) =>
                      prev.map((d, i) =>
                        i === idx ? { ...d, detail: v } : d,
                      ),
                    );
                  }}
                  className={areaClass + " mt-0"}
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-5 border-t border-border pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-wide text-heading">
            Quick facts
          </h2>
          <p className="text-xs text-muted">
            Optional. Empty fields are omitted on the destination page. Best
            time falls back to Climate if blank.
          </p>
        </div>
        <div>
          <label htmlFor="dest-qf-best-time" className="text-sm font-semibold text-heading">
            Best time to visit
          </label>
          <input
            id="dest-qf-best-time"
            value={qfBestTime}
            onChange={(e) => setQfBestTime(e.target.value)}
            placeholder="e.g. June–August for long daylight"
            className={fieldClass}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="dest-qf-currency" className="text-sm font-semibold text-heading">
              Currency
            </label>
            <input
              id="dest-qf-currency"
              value={qfCurrency}
              onChange={(e) => setQfCurrency(e.target.value)}
              placeholder="e.g. ISK (Icelandic króna)"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-qf-language" className="text-sm font-semibold text-heading">
              Language
            </label>
            <input
              id="dest-qf-language"
              value={qfLanguage}
              onChange={(e) => setQfLanguage(e.target.value)}
              placeholder="e.g. Icelandic"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-qf-plugs" className="text-sm font-semibold text-heading">
              Power plugs
            </label>
            <input
              id="dest-qf-plugs"
              value={qfPlugs}
              onChange={(e) => setQfPlugs(e.target.value)}
              placeholder="e.g. Type C / F, 230V"
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor="dest-qf-tap" className="text-sm font-semibold text-heading">
              Tap water
            </label>
            <input
              id="dest-qf-tap"
              value={qfTapWater}
              onChange={(e) => setQfTapWater(e.target.value)}
              placeholder="e.g. Safe to drink"
              className={fieldClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="dest-qf-timezone" className="text-sm font-semibold text-heading">
              Time zone
            </label>
            <input
              id="dest-qf-timezone"
              value={qfTimezone}
              onChange={(e) => setQfTimezone(e.target.value)}
              placeholder="e.g. GMT (UTC±0, no DST)"
              className={fieldClass}
            />
          </div>
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
                href={`/${success.slug}`}
                className="text-link underline-offset-2 hover:text-accent hover:underline"
              >
                Open /{success.slug}
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
