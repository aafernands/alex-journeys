"use client";

import { useEffect } from "react";

const REVEALED_CLASS = "is-pin-revealed";

function hasFineHover(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function hideAllPins(): void {
  document
    .querySelectorAll(`.pinnable-image.${REVEALED_CLASS}`)
    .forEach((el) => el.classList.remove(REVEALED_CLASS));
}

/**
 * Touch / coarse pointers: tap a photo to reveal its Pin control.
 * Tap the pin to share, tap the image again or outside (or scroll) to hide.
 * Fine-pointer desktops use CSS :hover instead — this listener no-ops there.
 */
export function PinterestPinReveal() {
  useEffect(() => {
    function onPointerUp(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".pinterest-pin-btn")) return;
      if (event.pointerType === "mouse" && hasFineHover()) return;

      const host = target.closest(".pinnable-image");
      if (!(host instanceof HTMLElement)) {
        hideAllPins();
        return;
      }

      const alreadyOpen = host.classList.contains(REVEALED_CLASS);
      hideAllPins();
      if (!alreadyOpen) host.classList.add(REVEALED_CLASS);
    }

    function onClickCapture(event: MouseEvent) {
      if (hasFineHover()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest(".pinterest-pin-btn")) return;
      if (!target.closest(".pinnable-image")) return;
      // First tap reveals; don't follow a wrapping content link.
      event.preventDefault();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") hideAllPins();
    }

    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("click", onClickCapture, true);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", hideAllPins, {
      passive: true,
      capture: true,
    });

    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("click", onClickCapture, true);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", hideAllPins, true);
    };
  }, []);

  return null;
}
