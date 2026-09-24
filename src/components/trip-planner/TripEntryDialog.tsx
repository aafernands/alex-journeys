"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

/** Native dialog supplies focus containment, Escape, and focus restoration. */
export function TripEntryDialog({
  title,
  onClose,
  children,
  fallbackFocusId,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  fallbackFocusId: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    const active = document.activeElement;
    const returnTo =
      active instanceof HTMLElement && active !== document.body
        ? active
        : document.getElementById(fallbackFocusId);
    element?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previous;
      const target = returnTo?.isConnected
        ? returnTo
        : document.getElementById(fallbackFocusId);
      target?.focus({ preventScroll: true });
    };
  }, [fallbackFocusId]);
  return (
    <dialog
      ref={dialog}
      className="plan-entry-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="plan-entry-dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="plan-text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      {children}
    </dialog>
  );
}
