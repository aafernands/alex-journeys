"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { getProviders } from "next-auth/react";
import dynamic from "next/dynamic";
import { X } from "lucide-react";

const ReaderLoginForm = dynamic(
  () =>
    import("@/components/ReaderLoginForm").then(
      (module) => module.ReaderLoginForm,
    ),
  { loading: () => <p role="status">Loading sign-in…</p> },
);

export function DrawerLoginDialog({
  onClose,
  onAuthenticated,
}: {
  onClose: () => void;
  onAuthenticated: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [providers, setProviders] = useState<
    Awaited<ReturnType<typeof getProviders>> | undefined
  >(undefined);
  const [returnTo, setReturnTo] = useState("/account");
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement;
    element?.showModal();
    let active = true;
    void getProviders()
      .then((result) => {
        if (active) {
          setProviders(result);
          setReturnTo(
            window.location.pathname +
              window.location.search +
              window.location.hash,
          );
        }
      })
      .catch(() => {
        if (active) setProviders(null);
      });
    return () => {
      active = false;
      element?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="drawer-login-dialog"
      aria-label="Sign in to Alex Journeys"
      onClick={(event) => {
        const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
        if (link && !link.getAttribute("target")) onAuthenticated();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button
        type="button"
        className="drawer-login-close"
        aria-label="Close sign-in"
        onClick={onClose}
      >
        <X size={20} aria-hidden="true" />
      </button>
      {providers === undefined ? (
        <p className="p-6" role="status">
          Loading sign-in…
        </p>
      ) : providers === null ? (
        <div className="p-6">
          <h2 className="font-display text-xl font-bold">
            Sign-in is unavailable
          </h2>
          <p className="mt-3 text-sm text-muted">
            Please close this window and try again shortly.
          </p>
        </div>
      ) : (
        <Suspense
          fallback={
            <p className="p-6" role="status">
              Loading sign-in…
            </p>
          }
        >
          <ReaderLoginForm
            googleConfigured={Boolean(providers.google)}
            twitterConfigured={Boolean(providers.twitter)}
            credentialsConfigured={Boolean(providers.credentials)}
            returnTo={returnTo}
            onAuthenticated={onAuthenticated}
          />
        </Suspense>
      )}
    </dialog>
  );
}
