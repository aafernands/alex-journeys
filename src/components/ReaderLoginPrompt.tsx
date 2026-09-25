"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { DrawerLoginDialog } from "@/components/header/DrawerLoginDialog";

export type ReaderLoginRequest = {
  /** Path to open after sign-in. Defaults to the current page. */
  returnTo?: string;
  /** Short line under the sign-in title. */
  intro?: string;
  onAuthenticated?: () => void;
  /** User dismissed the sheet. Not called after a successful sign-in. */
  onClose?: () => void;
};

const ReaderLoginContext = createContext<((request?: ReaderLoginRequest) => void) | null>(
  null,
);

export function useReaderLoginPrompt() {
  const open = useContext(ReaderLoginContext);
  if (!open) {
    throw new Error("Sign-in sheet is unavailable.");
  }
  return open;
}

/** One sign-in sheet for the drawer, the Saved tab, and save buttons. */
export function ReaderLoginPrompt({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ReaderLoginRequest | null>(null);

  const open = useCallback((next?: ReaderLoginRequest) => {
    setRequest(next ?? {});
  }, []);

  return (
    <ReaderLoginContext.Provider value={open}>
      {children}
      {request ? (
        <DrawerLoginDialog
          returnTo={request.returnTo}
          intro={request.intro}
          onClose={() => {
            const current = request;
            setRequest(null);
            current.onClose?.();
          }}
          onAuthenticated={() => {
            const current = request;
            setRequest(null);
            current.onAuthenticated?.();
          }}
        />
      ) : null}
    </ReaderLoginContext.Provider>
  );
}
