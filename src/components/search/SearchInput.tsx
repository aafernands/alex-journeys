"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

export type SearchInputHandle = {
  focus: () => void;
};

type Props = {
  /** Compact header style vs full-width page/drawer */
  variant?: "header" | "drawer" | "page";
  initialQuery?: string;
  /** Called after navigating (e.g. close mobile menu) */
  onNavigate?: () => void;
  /** Controlled page mode: update URL without full navigation on each keystroke */
  onQueryChange?: (q: string) => void;
  id?: string;
  className?: string;
  autoFocus?: boolean;
};

export const SearchInput = forwardRef<SearchInputHandle, Props>(
  function SearchInput(
    {
      variant = "header",
      initialQuery = "",
      onNavigate,
      onQueryChange,
      id = "site-search",
      className = "",
      autoFocus = false,
    },
    ref,
  ) {
    const router = useRouter();
    const inputRef = useRef<HTMLInputElement>(null);
    const [value, setValue] = useState(initialQuery);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    useEffect(() => {
      setValue(initialQuery);
    }, [initialQuery]);

    const go = useCallback(
      (q: string) => {
        const trimmed = q.trim();
        const href = trimmed
          ? `/search?q=${encodeURIComponent(trimmed)}`
          : "/search";
        router.push(href);
        onNavigate?.();
      },
      [router, onNavigate],
    );

    const onSubmit = (e: FormEvent) => {
      e.preventDefault();
      go(value);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        if (variant === "page" && value) {
          setValue("");
          onQueryChange?.("");
          router.push("/search");
        }
        inputRef.current?.blur();
      }
    };

    const sizeClass =
      variant === "header"
        ? "h-9 w-full max-w-xs text-sm"
        : variant === "drawer"
          ? "h-11 w-full text-base"
          : "h-12 w-full text-base";

    return (
      <form
        role="search"
        onSubmit={onSubmit}
        className={`relative ${className}`}
        action="/search"
        method="get"
      >
        <label htmlFor={id} className="sr-only">
          Search the site
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          size={variant === "header" ? 16 : 18}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          name="q"
          type="search"
          value={value}
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder="Search…"
          enterKeyHint="search"
          className={`${sizeClass} rounded-lg border border-border bg-white pl-9 pr-3 text-heading placeholder:text-muted transition hover:border-border-strong focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40`}
          onChange={(e) => {
            const next = e.target.value;
            setValue(next);
            onQueryChange?.(next);
          }}
          onKeyDown={onKeyDown}
        />
      </form>
    );
  },
);
