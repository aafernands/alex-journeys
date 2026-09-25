"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  isFocusedTripChrome,
  isStoredTripWorkspace,
} from "@/lib/trip-focus";

type TripFocusValue = {
  /** Hide discovery chrome: bottom tabs and the travel-alerts ticker. */
  focused: boolean;
  setWorkspaceFocused: (focused: boolean) => void;
  /** Setup/edit (step before the itinerary) keeps the tab bar. */
  setSuppressFocus: (suppress: boolean) => void;
};

const TripFocusContext = createContext<TripFocusValue | null>(null);

function applyTripFocusClass(focused: boolean) {
  document.documentElement.classList.toggle("trip-focus", focused);
  document.body.classList.toggle("trip-focus", focused);
}

export function TripFocusProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [workspaceFocused, setWorkspaceFocused] = useState(false);
  const [suppressFocus, setSuppressFocus] = useState(false);
  // Server render only knows the pathname. Search and localStorage are applied
  // before paint so hydration matches, then the class and flag catch up.
  const [focused, setFocused] = useState(() =>
    isFocusedTripChrome(pathname, ""),
  );

  useLayoutEffect(() => {
    const next =
      !suppressFocus &&
      (workspaceFocused ||
        isFocusedTripChrome(window.location.pathname, window.location.search) ||
        (normalizePlanPath(window.location.pathname) &&
          isStoredTripWorkspace()));
    applyTripFocusClass(next);
    setFocused(next);
  }, [pathname, suppressFocus, workspaceFocused]);

  const value = useMemo(
    () => ({ focused, setWorkspaceFocused, setSuppressFocus }),
    [focused],
  );

  return (
    <TripFocusContext.Provider value={value}>{children}</TripFocusContext.Provider>
  );
}

function normalizePlanPath(pathname: string): boolean {
  const path =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;
  return path === "/guides/plan-a-trip";
}

export function useTripFocus(): TripFocusValue {
  return (
    useContext(TripFocusContext) ?? {
      focused: false,
      setWorkspaceFocused: () => undefined,
      setSuppressFocus: () => undefined,
    }
  );
}

/** Call from the open itinerary so discovery chrome stays hidden until it unmounts. */
export function TripWorkspaceFocus() {
  const { setWorkspaceFocused } = useTripFocus();
  useLayoutEffect(() => {
    setWorkspaceFocused(true);
    return () => setWorkspaceFocused(false);
  }, [setWorkspaceFocused]);
  return null;
}

/** Trip setup and “edit details” stay on the discovery tab bar. */
export function TripDiscoveryChrome() {
  const { setSuppressFocus } = useTripFocus();
  useLayoutEffect(() => {
    setSuppressFocus(true);
    return () => setSuppressFocus(false);
  }, [setSuppressFocus]);
  return null;
}
