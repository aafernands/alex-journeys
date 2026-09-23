"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, Bookmark, Check, X } from "lucide-react";

type Props = {
  currencyLabel: string;
};

type RateResponse = {
  base?: string;
  quote?: string;
  rate?: number;
  updatedAt?: string;
  error?: string;
};

type SavedConversion = {
  id: string;
  from: string;
  to: string;
  amount: number;
  result: number;
  rate: number;
  savedAt: string;
};

const STORAGE_KEY = "fj:saved-currency-conversions";

function currencyCode(label: string): string {
  const match = /\b([A-Z]{3})\b/.exec(label.toUpperCase());
  return match?.[1] ?? "";
}

function readSaved(): SavedConversion[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CurrencyQuickFact({ currencyLabel }: Props) {
  const localCode = useMemo(() => currencyCode(currencyLabel), [currencyLabel]);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState(localCode || "USD");
  const [amount, setAmount] = useState("100");
  const [rate, setRate] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [savedItems, setSavedItems] = useState<SavedConversion[]>([]);

  useEffect(() => {
    if (localCode) setTo(localCode);
  }, [localCode]);

  async function convert() {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("Enter an amount greater than 0.");
      return;
    }
    setLoading(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(
        `/api/currency?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      );
      const data = (await res.json()) as RateResponse;
      if (!res.ok || !data.rate) {
        setError(data.error || "Could not load the current exchange rate.");
        setRate(null);
        return;
      }
      setRate(data.rate);
      setUpdatedAt(data.updatedAt || "");
    } catch {
      setError("Could not load the current exchange rate.");
      setRate(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open || !localCode) return;
    setSavedItems(readSaved());
    void convert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localCode]);

  const numericAmount = Number(amount);
  const result =
    rate && Number.isFinite(numericAmount) && numericAmount > 0
      ? numericAmount * rate
      : null;

  function saveConversion() {
    if (!rate || result == null) return;
    const item: SavedConversion = {
      id: `${from}-${to}-${Date.now()}`,
      from,
      to,
      amount: numericAmount,
      result,
      rate,
      savedAt: new Date().toISOString(),
    };
    const next = [item, ...readSaved()].slice(0, 20);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedItems(next);
    setSaved(true);
  }

  function swap() {
    setFrom(to);
    setTo(from);
    setRate(null);
    setSaved(false);
    window.setTimeout(() => void convert(), 0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-0.5 inline-flex items-center gap-1.5 text-left text-sm leading-snug text-heading underline decoration-border-strong underline-offset-4 transition hover:text-accent"
      >
        {currencyLabel}
        <ArrowRightLeft className="size-3.5 shrink-0" aria-hidden="true" />
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="currency-converter-title"
            className="w-full rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-2xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Currency converter</p>
                <h3
                  id="currency-converter-title"
                  className="mt-1 font-display text-2xl font-bold text-heading"
                >
                  Convert before you go
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Check the latest reference rate for {currencyLabel}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-border text-muted transition hover:bg-surface-soft hover:text-heading"
                aria-label="Close currency converter"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <label className="text-sm font-semibold text-heading">
                From
                <input
                  value={from}
                  onChange={(event) =>
                    setFrom(event.target.value.toUpperCase().slice(0, 3))
                  }
                  maxLength={3}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 uppercase"
                />
              </label>
              <button
                type="button"
                onClick={swap}
                className="mb-0.5 grid size-11 place-items-center rounded-full border border-border bg-surface-soft text-heading"
                aria-label="Swap currencies"
              >
                <ArrowRightLeft className="size-4" aria-hidden="true" />
              </button>
              <label className="text-sm font-semibold text-heading">
                To
                <input
                  value={to}
                  onChange={(event) =>
                    setTo(event.target.value.toUpperCase().slice(0, 3))
                  }
                  maxLength={3}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border px-3 uppercase"
                />
              </label>
            </div>

            <label className="mt-4 block text-sm font-semibold text-heading">
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-border px-3"
              />
            </label>

            <button
              type="button"
              onClick={() => void convert()}
              disabled={loading || from.length !== 3 || to.length !== 3}
              className="btn btn-primary mt-4 w-full justify-center"
            >
              {loading ? "Checking rate…" : "Convert"}
            </button>

            {error ? (
              <p className="mt-3 text-sm font-medium text-link">{error}</p>
            ) : null}

            {rate && result != null ? (
              <div className="mt-5 rounded-xl border border-border bg-surface-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Estimated conversion
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-heading">
                  {numericAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {from} ≈{" "}
                  {result.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {to}
                </p>
                <p className="mt-1 text-xs text-muted">
                  1 {from} = {rate.toFixed(4)} {to}
                  {updatedAt ? ` · Updated ${updatedAt}` : ""}
                </p>
                <button
                  type="button"
                  onClick={saveConversion}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-link hover:text-accent"
                >
                  {saved ? (
                    <Check className="size-4" aria-hidden="true" />
                  ) : (
                    <Bookmark className="size-4" aria-hidden="true" />
                  )}
                  {saved ? "Saved to your travel tools" : "Save this conversion"}
                </button>
                <p className="mt-2 text-[0.7rem] leading-relaxed text-muted">
                  Reference rate only. Banks, cards, ATMs, and exchange counters may use different rates or fees.
                </p>
              </div>
            ) : null}

            {savedItems.length > 0 ? (
              <div className="mt-5 border-t border-border pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                  Your saved conversions
                </p>
                <ul className="mt-2 space-y-2">
                  {savedItems.slice(0, 3).map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-surface-soft px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-heading">
                        {item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.from}
                      </span>
                      <span className="text-muted">≈</span>
                      <span className="font-semibold text-heading">
                        {item.result.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.to}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[0.7rem] text-muted">
                  Saved in your Fernandes Journeys travel tools on this device.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}
