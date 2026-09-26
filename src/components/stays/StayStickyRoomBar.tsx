"use client";

import { useEffect, useState } from "react";
import { BedDouble } from "lucide-react";

type Props = {
  fromPriceLabel: string;
  hasStayDates: boolean;
};

/**
 * Phone-only bottom bar on the hotel view. It jumps to the room list, then
 * steps aside while the list is on screen so each rate's own Select button
 * is the action (and the bar never covers the last rate).
 */
export function StayStickyRoomBar({ fromPriceLabel, hasStayDates }: Props) {
  const [roomsInView, setRoomsInView] = useState(false);

  useEffect(() => {
    if (!hasStayDates || typeof IntersectionObserver === "undefined") return;
    const target = document.getElementById("rooms");
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setRoomsInView(Boolean(entry?.isIntersecting)),
      // The list counts as "in view" once its top passes the lower third of the screen.
      { rootMargin: "0px 0px -35% 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasStayDates]);

  const hidden = hasStayDates && roomsInView;

  return (
    <div
      className={`safe-bottom-bar glass glass-strip fixed inset-x-0 bottom-0 z-[140] px-3 pt-3 transition duration-200 md:hidden ${
        hidden ? "invisible translate-y-full opacity-0" : ""
      }`}
      aria-hidden={hidden || undefined}
    >
      <div className="mx-auto flex max-w-xl items-center gap-3">
        {fromPriceLabel ? (
          <div className="min-w-0 flex-1">
            <p className="ui-field-hint">Rooms from</p>
            <p className="book-price truncate">{fromPriceLabel}</p>
          </div>
        ) : null}
        <a
          href={hasStayDates ? "#rooms" : "#hotel-search-editor"}
          className="btn ui-btn btn-primary flex-1 justify-center text-center"
          tabIndex={hidden ? -1 : undefined}
        >
          <BedDouble className="mr-2 h-4 w-4" aria-hidden="true" />
          {hasStayDates ? "Select a room" : "Add dates"}
        </a>
      </div>
    </div>
  );
}
