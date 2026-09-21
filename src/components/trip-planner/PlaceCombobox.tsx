"use client";

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  foldPlace,
  suggestPlaces,
  type PlaceSuggestion,
} from "@/lib/place-suggestions";

type Props = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className: string;
  journalLabels: readonly string[];
  invalid?: boolean;
  describedBy?: string;
  listLabel: string;
};

export function PlaceCombobox({
  id,
  value,
  onChange,
  className,
  journalLabels,
  invalid,
  describedBy,
  listLabel,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const options = useMemo(
    () => suggestPlaces(value, journalLabels),
    [value, journalLabels],
  );
  const exact =
    options.length > 0 &&
    options.some((option) => foldPlace(option.label) === foldPlace(value));
  const visible = open && options.length > 0 && !exact;
  const active = Math.min(activeIndex, Math.max(0, options.length - 1));

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!visible) return;
    const option = rootRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    option?.scrollIntoView({ block: "nearest" });
  }, [visible, active]);

  function select(option: PlaceSuggestion) {
    onChange(option.label);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!visible) {
        setOpen(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((index) => Math.min(index + 1, options.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      if (!visible) return;
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }
    if (event.key === "Escape") {
      if (!visible) return;
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "Enter" && visible) {
      event.preventDefault();
      const option = options[active];
      if (option) select(option);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        className={className}
        value={value}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible ? `${listId}-opt-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node)) {
            setOpen(false);
          }
        }}
      />
      {visible ? (
        <ul
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-white py-1 shadow-[0_12px_32px_rgba(60,40,20,0.12)]"
        >
          {options.map((option, index) => {
            const selected = index === active;
            return (
              <li key={option.label} role="presentation">
                <div
                  id={`${listId}-opt-${index}`}
                  role="option"
                  aria-selected={selected}
                  data-active={selected ? "true" : undefined}
                  className={`flex cursor-pointer items-baseline justify-between gap-3 px-4 py-2.5 text-sm ${
                    selected ? "bg-accent/10 text-heading" : "text-text"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option)}
                >
                  <span className="font-medium">{option.label}</span>
                  {option.journal || option.iata ? (
                    <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.06em] text-muted">
                      {option.journal ? "Journal" : option.iata}
                    </span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
