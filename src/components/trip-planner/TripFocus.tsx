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
import { isFocusedTripChrome } from "@/lib/trip-focus";

type TripFocusValue = {
  /** Hide discovery chrome: bottom tabs and the travel-alerts ticker. */
  focused: boolean;
  setWorkspaceFocused: (focused: boolean) => void;
};

const TripFocusContext = createContext<TripFocusValue | null>(null);

function applyTripFocusClass(focused: boolean) {
  document.documentElement.classList.toggle("trip-focus", focused);
  document.body.classList.toggle("trip-focus", focused);
}

export function TripFocusProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [workspaceFocused, setWorkspaceFocused] = useState(false);
  // Server render knows the pathname. Search (for /out?from=trip) is applied
  // before paint so hydration matches, then the class and flag catch up.
  const [focused, setFocused] = useState(() =>
    isFocusedTripChrome(pathname, ""),
  );

  useLayoutEffect(() => {
    const next =
      workspaceFocused ||
      isFocusedTripChrome(window.location.pathname, window.location.search);
    applyTripFocusClass(next);
    setFocused(next);
  }, [pathname, workspaceFocused]);

  const value = useMemo(
    () => ({ focused, setWorkspaceFocused }),
    [focused],
  );

  return (
    <TripFocusContext.Provider value={value}>{children}</TripFocusContext.Provider>
  );
}

export function useTripFocus(): TripFocusValue {
  return (
    useContext(TripFocusContext) ?? {
      focused: false,
      setWorkspaceFocused: () => undefined,
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

