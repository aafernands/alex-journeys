"use client";

import { useEffect, useId, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, SlidersHorizontal, Star } from "lucide-react";
import { plan } from "@/components/trip-planner/density";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import {
  clearStayFilters,
  guestPillLabel,
  pricePillLabel,
  stayAmenityLabel,
  stayFilterCount,
  staySortLabel,
  type StayAmenityKey,
  type StayAmenityOption,
  type StayGuestMinimum,
  type StayKind,
  type StayPriceBounds,
  type StayResultFilters,
  type StaySort,
} from "@/lib/stay-filters";
import { staysPath, type StaysQuery } from "@/lib/stays";

type Panel = "all" | "price" | "sort" | "guest" | "stars" | "amenities";

type Props = {
  query: StaysQuery;
  count: number;
  priceBounds: StayPriceBounds | null;
  amenities: StayAmenityOption[];
  propertyTypes: boolean;
  nights: number;
};

const SORTS: StaySort[] = ["popular", "price_asc", "price_desc", "rating", "stars"];
const GUEST_CHOICES: StayGuestMinimum[] = [0, 7, 8, 9];
const STAR_CHOICES = [5, 4, 3, 2, 1];

function resultsPath(query: StaysQuery, filters: StayResultFilters): string {
  return staysPath({
    destination: query.destination,
    startDate: query.startDate,
    endDate: query.endDate,
    adults: query.adults,
    children: query.children,
    rooms: query.rooms,
    sessionId: query.sessionId,
    tripId: query.tripId,
    filters,
  });
}

function wholeDollars(raw: string): number | null | "invalid" {
  const value = raw.trim();
  if (!value) return null;
  if (!/^\d{1,6}$/.test(value)) return "invalid";
  return Number(value);
}

export function StayFilterBar({
  query,
  count,
  priceBounds,
  amenities,
  propertyTypes,
  nights,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState<Panel | null>(null);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const [draft, setDraft] = useState(query.filters);
  const [priceRaw, setPriceRaw] = useState({ min: "", max: "" });
  const [priceError, setPriceError] = useState("");

  const knownAmenities = query.filters.amenities.filter((key) =>
    amenities.some((amenity) => amenity.key === key),
  );
  const filters: StayResultFilters = {
    ...query.filters,
    amenities: knownAmenities,
    kind: propertyTypes ? query.filters.kind : "any",
  };
  const activeCount = stayFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const previous = document.body.style.overflow;
    if (mobile) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  function go(next: StayResultFilters) {
    setOpen(null);
    setPriceError("");
    startTransition(() => {
      router.push(resultsPath(query, next));
    });
  }

  function togglePanel(panel: Panel, event: MouseEvent<HTMLButtonElement>) {
    if (open === panel) {
      setOpen(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = panel === "all" ? 448 : 352;
    setAnchor({
      top: rect.bottom + 8,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
    });
    setDraft(filters);
    setPriceRaw({
      min: filters.minPrice == null ? "" : String(filters.minPrice),
      max: filters.maxPrice == null ? "" : String(filters.maxPrice),
    });
    setPriceError("");
    setOpen(panel);
  }

  function applyDraft(next: StayResultFilters = draft, raw = priceRaw) {
    const minPrice = wholeDollars(open === "all" ? raw.min : String(next.minPrice ?? ""));
    const maxPrice = wholeDollars(open === "all" ? raw.max : String(next.maxPrice ?? ""));
    if (minPrice === "invalid" || maxPrice === "invalid") {
      setPriceError("Use whole dollar amounts.");
      return;
    }
    let low = minPrice;
    let high = maxPrice;
    if (low != null && high != null && low > high) {
      const swap = low;
      low = high;
      high = swap;
    }
    go({
      ...next,
      minPrice: low,
      maxPrice: high,
      amenities: next.amenities.filter((key) => amenities.some((amenity) => amenity.key === key)),
      kind: propertyTypes ? next.kind : "any",
    });
  }

  function applyPriceInputs(minRaw: string, maxRaw: string) {
    const minPrice = wholeDollars(minRaw);
    const maxPrice = wholeDollars(maxRaw);
    if (minPrice === "invalid" || maxPrice === "invalid") {
      setPriceError("Use whole dollar amounts.");
      return;
    }
    let low = minPrice;
    let high = maxPrice;
    if (low != null && high != null && low > high) {
      const swap = low;
      low = high;
      high = swap;
    }
    go({ ...filters, minPrice: low, maxPrice: high });
  }

  const starLabel =
    filters.stars.length === 0
      ? "Star rating"
      : filters.stars.length === 1
        ? `${filters.stars[0]} star`
        : `${filters.stars.length} star ratings`;
  const amenityLabel =
    filters.amenities.length === 0
      ? "Amenities"
      : filters.amenities.length === 1
        ? (amenities.find((amenity) => amenity.key === filters.amenities[0])?.label ??
          stayAmenityLabel(filters.amenities[0]))
        : `Amenities · ${filters.amenities.length}`;

  return (
    <div className={pending ? "opacity-80" : undefined} aria-busy={pending}>
      {propertyTypes ? (
        <div className="mb-2 flex gap-2" role="group" aria-label="Property type">
          {(
            [
              ["any", "Any"],
              ["hotel", "Hotels"],
              ["home", "Homes"],
            ] as const
          ).map(([kind, label]) => {
            const selected = filters.kind === kind;
            return (
              <Chip
                key={kind}
                selected={selected}
                aria-pressed={selected}
                onClick={() => {
                  if (selected) return;
                  go({ ...filters, kind: kind as StayKind });
                }}
              >
                {label}
              </Chip>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <div className="stay-filter-scroller flex min-w-0 flex-1 gap-2 overflow-x-auto py-1">
          <FilterPill
            label="All filters"
            iconOnly
            active={activeCount > 0}
            count={activeCount}
            expanded={open === "all"}
            onClick={(event) => togglePanel("all", event)}
          />
          <FilterPill
            label={pricePillLabel(filters)}
            active={filters.minPrice != null || filters.maxPrice != null}
            expanded={open === "price"}
            onClick={(event) => togglePanel("price", event)}
          />
          <FilterPill
            label={filters.sort === "popular" ? "Popular" : staySortLabel(filters.sort)}
            active={filters.sort !== "popular"}
            expanded={open === "sort"}
            onClick={(event) => togglePanel("sort", event)}
          />
          <FilterPill
            label={guestPillLabel(filters.guestRating)}
            active={filters.guestRating > 0}
            expanded={open === "guest"}
            onClick={(event) => togglePanel("guest", event)}
          />
          <FilterPill
            label={starLabel}
            active={filters.stars.length > 0}
            expanded={open === "stars"}
            onClick={(event) => togglePanel("stars", event)}
          />
          {amenities.length > 0 ? (
            <FilterPill
              label={amenityLabel}
              active={filters.amenities.length > 0}
              expanded={open === "amenities"}
              onClick={(event) => togglePanel("amenities", event)}
            />
          ) : null}
          <FilterPill
            label="Free cancellation"
            active={filters.freeCancellation}
            expanded={false}
            caret={false}
            onClick={() => go({ ...filters, freeCancellation: !filters.freeCancellation })}
          />
        </div>
        {activeCount > 0 ? (
          <Button
            variant="ghost"
            className="hidden shrink-0 sm:inline-flex"
            onClick={() => go(clearStayFilters(filters))}
          >
            Clear all
          </Button>
        ) : null}
      </div>
      {activeCount > 0 ? (
        <Button variant="ghost" className="sm:hidden" onClick={() => go(clearStayFilters(filters))}>
          Clear all
        </Button>
      ) : null}
      {pending ? (
        <p className="mt-2 text-sm font-semibold text-muted" role="status">
          Updating stays…
        </p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[200]">
          <button
            type="button"
            className="absolute inset-0 bg-near-black/45 md:bg-transparent"
            aria-label="Close filters"
            onClick={() => setOpen(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`glass-strong absolute inset-x-0 bottom-0 max-h-[min(85dvh,40rem)] overflow-y-auto rounded-t-[var(--radius-card)] p-3 max-md:!top-auto max-md:!right-0 max-md:!left-0 md:right-auto md:bottom-auto md:rounded-[var(--radius-card)] ${
              open === "all" ? "md:w-[28rem]" : "md:w-[22rem]"
            }`}
            style={{
              top: anchor.top,
              left: anchor.left,
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-sand md:hidden" aria-hidden="true" />
            <h3 id={titleId} className="ui-section-title">
              {open === "all"
                ? "All filters"
                : open === "price"
                  ? "Price"
                  : open === "sort"
                    ? "Sort"
                    : open === "guest"
                      ? "Guest rating"
                      : open === "stars"
                        ? "Star rating"
                        : "Amenities"}
            </h3>
            {open === "all" ? (
              <p className="mt-1 text-sm text-muted">
                {count} {count === 1 ? "stay" : "stays"} with the filters on this page
              </p>
            ) : null}

            {open === "sort" ? (
              <ChoiceList
                name="stay-sort"
                value={filters.sort}
                options={SORTS.map((sort) => ({
                  value: sort,
                  label: staySortLabel(sort),
                }))}
                onChange={(sort) => go({ ...filters, sort: SORTS.find((item) => item === sort) ?? "popular" })}
              />
            ) : null}

            {open === "guest" ? (
              <ChoiceList
                name="stay-guest"
                value={String(filters.guestRating)}
                options={GUEST_CHOICES.map((choice) => ({
                  value: String(choice),
                  label: choice === 0 ? "Any rating" : `${choice}+`,
                }))}
                onChange={(value) =>
                  go({ ...filters, guestRating: Number(value) as StayGuestMinimum })
                }
              />
            ) : null}

            {open === "price" ? (
              <PriceFields
                key={`${filters.minPrice ?? ""}-${filters.maxPrice ?? ""}`}
                minPrice={filters.minPrice}
                maxPrice={filters.maxPrice}
                bounds={priceBounds}
                nights={nights}
                error={priceError}
                onApply={applyPriceInputs}
                onClear={() => go({ ...filters, minPrice: null, maxPrice: null })}
              />
            ) : null}

            {open === "stars" ? (
              <div className="mt-3">
                <StarFields
                  selected={draft.stars}
                  onChange={(stars) => setDraft({ ...draft, stars })}
                />
                <ApplyRow
                  onApply={() => applyDraft()}
                  onClear={() => go({ ...filters, stars: [] })}
                  clearLabel="Clear stars"
                />
              </div>
            ) : null}

            {open === "amenities" ? (
              <div className="mt-3">
                <AmenityFields
                  options={amenities}
                  selected={draft.amenities}
                  onChange={(next) => setDraft({ ...draft, amenities: next })}
                />
                <ApplyRow
                  onApply={() => applyDraft()}
                  onClear={() => go({ ...filters, amenities: [] })}
                  clearLabel="Clear amenities"
                />
              </div>
            ) : null}

            {open === "all" ? (
              <div className="mt-3 space-y-3">
                {propertyTypes ? (
                  <fieldset>
                    <legend className={plan.label}>Property type</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(
                        [
                          ["any", "Any"],
                          ["hotel", "Hotels"],
                          ["home", "Homes"],
                        ] as const
                      ).map(([kind, label]) => (
                        <Chip
                          key={kind}
                          selected={draft.kind === kind}
                          aria-pressed={draft.kind === kind}
                          onClick={() => setDraft({ ...draft, kind })}
                        >
                          {label}
                        </Chip>
                      ))}
                    </div>
                  </fieldset>
                ) : null}
                <div>
                  <p className={plan.label}>Sort</p>
                  <ChoiceList
                    name="stay-sort-all"
                    value={draft.sort}
                    options={SORTS.map((sort) => ({ value: sort, label: staySortLabel(sort) }))}
                    onChange={(sort) =>
                      setDraft({ ...draft, sort: SORTS.find((item) => item === sort) ?? "popular" })
                    }
                  />
                </div>
                <div>
                  <p className={plan.label}>Price</p>
                  <PriceFields
                    key={`all-${filters.minPrice ?? ""}-${filters.maxPrice ?? ""}-${open}`}
                    minPrice={filters.minPrice}
                    maxPrice={filters.maxPrice}
                    bounds={priceBounds}
                    nights={nights}
                    error={priceError}
                    embedded
                    onChange={(min, max) => setPriceRaw({ min, max })}
                    onApply={() => undefined}
                    onClear={() => {
                      setPriceRaw({ min: "", max: "" });
                      setDraft({ ...draft, minPrice: null, maxPrice: null });
                    }}
                  />
                </div>
                <div>
                  <p className={plan.label}>Guest rating</p>
                  <ChoiceList
                    name="stay-guest-all"
                    value={String(draft.guestRating)}
                    options={GUEST_CHOICES.map((choice) => ({
                      value: String(choice),
                      label: choice === 0 ? "Any rating" : `${choice}+`,
                    }))}
                    onChange={(value) =>
                      setDraft({ ...draft, guestRating: Number(value) as StayGuestMinimum })
                    }
                  />
                </div>
                <div>
                  <p className={plan.label}>Star rating</p>
                  <StarFields
                    selected={draft.stars}
                    onChange={(stars) => setDraft({ ...draft, stars })}
                  />
                </div>
                {amenities.length > 0 ? (
                  <div>
                    <p className={plan.label}>Amenities</p>
                    <AmenityFields
                      options={amenities}
                      selected={draft.amenities}
                      onChange={(next) => setDraft({ ...draft, amenities: next })}
                    />
                  </div>
                ) : null}
                <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-heading">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--accent)]"
                    checked={draft.freeCancellation}
                    onChange={(event) =>
                      setDraft({ ...draft, freeCancellation: event.target.checked })
                    }
                  />
                  Free cancellation
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <Button variant="ghost" onClick={() => go(clearStayFilters(filters))}>
                    Clear all
                  </Button>
                  <Button variant="primary" onClick={() => applyDraft()}>
                    Apply filters
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterPill({
  label,
  active,
  expanded,
  onClick,
  iconOnly = false,
  caret = true,
  count = 0,
}: {
  label: string;
  active: boolean;
  expanded: boolean;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  iconOnly?: boolean;
  caret?: boolean;
  count?: number;
}) {
  return (
    <Chip
      selected={active}
      className="shrink-0 gap-1"
      aria-label={iconOnly ? (count > 0 ? `${label}, ${count} selected` : label) : undefined}
      aria-expanded={caret ? expanded : undefined}
      aria-pressed={caret ? undefined : active}
      onClick={onClick}
    >
      {iconOnly ? <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> : <span>{label}</span>}
      {iconOnly && count > 0 ? <span>{count}</span> : null}
      {caret && !iconOnly ? <ChevronDown className="h-4 w-4" aria-hidden="true" /> : null}
    </Chip>
  );
}

function ChoiceList({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-2" role="radiogroup" aria-label={name}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={option.value}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-heading"
          >
            <input
              type="radio"
              name={name}
              className="h-5 w-5 accent-[var(--accent)]"
              checked={selected}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}

function StarFields({
  selected,
  onChange,
}: {
  selected: number[];
  onChange: (stars: number[]) => void;
}) {
  return (
    <div className="mt-2">
      {STAR_CHOICES.map((star) => {
        const checked = selected.includes(star);
        return (
          <label
            key={star}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-heading"
          >
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={checked}
              onChange={() => {
                const next = checked
                  ? selected.filter((value) => value !== star)
                  : [...selected, star].sort((a, b) => a - b);
                onChange(next);
              }}
            />
            <span className="inline-flex items-center gap-1">
              {star}
              <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
              <span className="sr-only">{star === 1 ? "star" : "stars"}</span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function AmenityFields({
  options,
  selected,
  onChange,
}: {
  options: StayAmenityOption[];
  selected: StayAmenityKey[];
  onChange: (keys: StayAmenityKey[]) => void;
}) {
  return (
    <div className="mt-2">
      {options.map((amenity) => {
        const checked = selected.includes(amenity.key);
        return (
          <label
            key={amenity.key}
            className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold text-heading"
          >
            <input
              type="checkbox"
              className="h-5 w-5 accent-[var(--accent)]"
              checked={checked}
              onChange={() => {
                onChange(
                  checked
                    ? selected.filter((key) => key !== amenity.key)
                    : [...selected, amenity.key],
                );
              }}
            />
            {amenity.label}
          </label>
        );
      })}
    </div>
  );
}

function PriceFields({
  minPrice,
  maxPrice,
  bounds,
  nights,
  error,
  embedded = false,
  onChange,
  onApply,
  onClear,
}: {
  minPrice: number | null;
  maxPrice: number | null;
  bounds: StayPriceBounds | null;
  nights: number;
  error: string;
  embedded?: boolean;
  onChange?: (minRaw: string, maxRaw: string) => void;
  onApply: (minRaw: string, maxRaw: string) => void;
  onClear: () => void;
}) {
  const [minRaw, setMinRaw] = useState(minPrice == null ? "" : String(minPrice));
  const [maxRaw, setMaxRaw] = useState(maxPrice == null ? "" : String(maxPrice));
  function update(nextMin: string, nextMax: string) {
    setMinRaw(nextMin);
    setMaxRaw(nextMax);
    onChange?.(nextMin, nextMax);
  }
  const nightLabel = nights > 1 ? ` Totals cover ${nights} nights.` : "";
  return (
    <form
      className="mt-3"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(minRaw, maxRaw);
      }}
    >
      <p className="text-sm text-muted">
        Total for the selected dates, in USD.{nightLabel}
        {bounds
          ? ` Stays in this search run about $${bounds.min.toLocaleString("en-US")}–$${bounds.max.toLocaleString("en-US")}.`
          : ""}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="plan-stack-tight">
          <span className={plan.label}>Minimum</span>
          <input
            inputMode="numeric"
            value={minRaw}
            onChange={(event) => update(event.target.value, maxRaw)}
            placeholder={bounds ? String(bounds.min) : "0"}
            className={plan.input}
            aria-label="Minimum total price"
          />
        </label>
        <label className="plan-stack-tight">
          <span className={plan.label}>Maximum</span>
          <input
            inputMode="numeric"
            value={maxRaw}
            onChange={(event) => update(minRaw, event.target.value)}
            placeholder={bounds ? String(bounds.max) : "Any"}
            className={plan.input}
            aria-label="Maximum total price"
          />
        </label>
      </div>
      {error ? (
        <p className="ui-field-error mt-2" role="alert">
          {error}
        </p>
      ) : null}
      {embedded ? (
        <div className="mt-2">
          <Button
            variant="ghost"
            onClick={() => {
              update("", "");
              onClear();
            }}
          >
            Clear price
          </Button>
        </div>
      ) : (
        <ApplyRow onApply={() => onApply(minRaw, maxRaw)} onClear={onClear} clearLabel="Clear price" />
      )}
    </form>
  );
}

function ApplyRow({
  onApply,
  onClear,
  clearLabel,
}: {
  onApply: () => void;
  onClear: () => void;
  clearLabel: string;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <Button variant="ghost" onClick={onClear}>
        {clearLabel}
      </Button>
      <Button variant="primary" onClick={onApply}>
        Apply
      </Button>
    </div>
  );
}
