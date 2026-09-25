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
import { isFocusedBookingPath } from "@/lib/trip-focus";

type TripFocusValue = {
  /** Hide discovery chrome: bottom tabs and the travel-alerts ticker. */
  focused: boolean;
  setWorkspaceFocused: (focused: boolean) => void;
};

const TripFocusContext = createContext<TripFocusValue | null>(null);

export function TripFocusProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [workspaceFocused, setWorkspaceFocused] = useState(false);
  const focused = workspaceFocused || isFocusedBookingPath(pathname);

  useLayoutEffect(() => {
    document.body.classList.toggle("trip-focus", focused);
    return () => {
      document.body.classList.remove("trip-focus");
    };
  }, [focused]);

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
