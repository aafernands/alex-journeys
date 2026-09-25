"use client";

import { Check } from "lucide-react";
import { plan } from "@/components/trip-planner/density";
import {
  itemColorSwatch,
  TRIP_ITEM_COLORS,
  type TripItemColor,
} from "@/lib/trip-item-color";
import type { TripItemType } from "@/lib/trip-record";

export function ItemColorField({
  type,
  title,
  value,
  onChange,
}: {
  type: TripItemType;
  title: string;
  value: TripItemColor | "";
  onChange: (color: TripItemColor | "") => void;
}) {
  const automatic = itemColorSwatch({ type, title });
  return (
    <fieldset className="plan-color-field">
      <legend className={plan.label}>Color</legend>
      <div className="plan-color-row">
        <label className="plan-color-choice">
          <input
            className="sr-only"
            type="radio"
            name="plan-item-color"
            value=""
            checked={value === ""}
            onChange={() => onChange("")}
          />
          <span className="plan-color-face plan-color-default">
            <span
              className="plan-color-dot"
              style={{ background: automatic.hex }}
              aria-hidden="true"
            />
            Default
          </span>
        </label>
        {TRIP_ITEM_COLORS.map((swatch) => {
          const selected = value === swatch.id;
          return (
            <label key={swatch.id} className="plan-color-choice">
              <input
                className="sr-only"
                type="radio"
                name="plan-item-color"
                value={swatch.id}
                checked={selected}
                onChange={() => onChange(swatch.id)}
              />
              <span className="plan-color-face" style={{ background: swatch.hex }}>
                <span className="sr-only">{swatch.label}</span>
                {selected ? (
                  <Check size={18} strokeWidth={2.75} color={swatch.check} aria-hidden="true" />
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
