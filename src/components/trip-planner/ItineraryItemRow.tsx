"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { Ellipsis } from "lucide-react";
import { NavIcon } from "@/components/icons/NavIcon";
import { ListRow } from "@/components/ui/ListRow";
import { OutboundLink } from "@/components/outbound/OutboundLink";
import { flightItemLinkLabel } from "@/lib/flights";
import {
  isStayConfirmationPath,
  parseStaysSearchParams,
  stayConfirmationPath,
  stayItemLinkLabel,
} from "@/lib/stays";
import { cleanItemColor, itemAccentHex } from "@/lib/trip-item-color";
import {
  itemScheduleTime,
  type TripItem,
  type TripItemStatus,
  type TripItemType,
} from "@/lib/trip-record";

const TYPE_ICON: Record<TripItemType, string> = {
  flight: "plane",
  hotel: "hotel",
  car: "car",
  activity: "sparkles",
  note: "book-open",
  other: "bookmark",
};

const TYPE_LABEL: Record<TripItemType, string> = {
  flight: "Flight",
  hotel: "Stay",
  car: "Car",
  activity: "Activity",
  note: "Note",
  other: "Booking",
};

/** Status words as the item sheet shows them. */
const ENTRY_STATUS_LABEL: Record<TripItemStatus, string> = {
  todo: "Planned",
  booked: "Booked",
  skipped: "Skipped",
};

export function entryStatusLabel(status: TripItemStatus | undefined): string {
  return (status && ENTRY_STATUS_LABEL[status]) || "Planned";
}

/** Tint hooks for an entry row: chosen color, or "default" for the neutral paper tint. */
export function entryTintProps(item: TripItem) {
  return {
    "data-status": item.status || "todo",
    "data-color": cleanItemColor(item.color) || "default",
    style: { "--plan-item-accent": itemAccentHex(item) } as CSSProperties,
  };
}

/** On-site confirmation for a booked stay, matching the link the row used to show. */
export function bookedStayHref(item: TripItem): string {
  if (item.type !== "hotel" || item.status !== "booked" || !item.confirmation) return "";
  if (!item.url.startsWith("/stays")) return "";
  if (isStayConfirmationPath(item.url)) return item.url;
  return stayConfirmationPath(
    {
      bookingId: item.confirmation,
      confirmationCode: item.confirmation,
      hotelName: item.title,
      status: "CONFIRMED",
      checkin: "",
      checkout: "",
      dateLabel: "",
      roomName: "",
      rateLabel: "",
      totalLabel: "",
      sandbox: false,
    },
    parseStaysSearchParams(
      Object.fromEntries(new URL(`https://alexjourneys.com${item.url}`).searchParams),
    ),
  );
}

function scanExtra(item: TripItem): string {
  const parts: string[] = [];
  if (item.type === "car" && item.pickupLocation) parts.push(item.pickupLocation);
  const note = item.notes.replace(/\s+/g, " ").trim();
  if (note && note !== item.pickupLocation) {
    parts.push(note.length > 60 ? `${note.slice(0, 57)}…` : note);
  }
  if (!item.confirmation && parts.length === 0) {
    const label = TYPE_LABEL[item.type];
    if (item.title.trim().toLowerCase() !== label.toLowerCase()) parts.push(label);
  }
  return parts.join(" · ");
}

function menuLink(
  item: TripItem,
  stayHref: string,
): { href: string; label: string; external: boolean } | null {
  const href = item.url.trim();
  if (!href) return null;
  if (stayHref && (href === stayHref || href.startsWith("/stays"))) return null;
  const onSite = href.startsWith("/") && !href.startsWith("//");
  const label = onSite
    ? flightItemLinkLabel(href) ||
      stayItemLinkLabel(href) ||
      (href.startsWith("/stays") ? "View stay" : "Open link")
    : "Open link";
  return { href, label, external: !onSite };
}

function closeMenu(target: EventTarget | null) {
  if (!(target instanceof Element)) return;
  const details = target.closest("details");
  if (details) details.open = false;
}

export function ItineraryItemRow({
  item,
  onEdit,
  onRemove,
  dragging = false,
  drag,
  footer,
}: {
  item: TripItem;
  onEdit: () => void;
  onRemove: () => void;
  dragging?: boolean;
  drag?: ReactNode;
  footer?: ReactNode;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const stayHref = bookedStayHref(item);
  const time = itemScheduleTime(item);
  const extra = scanExtra(item);
  const link = menuLink(item, stayHref);
  const timeLabel = time || "Any time";

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      const root = menuRef.current;
      if (!root?.open) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      root.open = false;
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  const bodyRest = [timeLabel, item.confirmation, extra].filter(Boolean).join(" · ");
  const bodyDetail = (
    <>
      <span className="plan-entry-status">{entryStatusLabel(item.status)}</span>
      {bodyRest ? ` · ${bodyRest}` : ""}
    </>
  );

  return (
    <article
      className={`plan-timeline-entry plan-entry-tint${dragging ? " is-dragging" : ""}`}
      data-type={item.type}
      {...entryTintProps(item)}
    >
      <ListRow
        leading={
          <>
            {drag}
            <span style={{ color: itemAccentHex(item) }} aria-hidden="true">
              <NavIcon name={TYPE_ICON[item.type]} size={18} />
            </span>
          </>
        }
        title={item.title}
        detail={bodyDetail}
        href={stayHref || undefined}
        onClick={stayHref ? undefined : onEdit}
        trailing={
          <details
            ref={menuRef}
            className="plan-item-menu"
            onToggle={(event) => {
              if (!event.currentTarget.open) return;
              document.querySelectorAll(".plan-item-menu[open]").forEach((node) => {
                if (node !== event.currentTarget) (node as HTMLDetailsElement).open = false;
              });
            }}
            onKeyDown={(event) => {
              if (event.key !== "Escape" || !event.currentTarget.open) return;
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }}
          >
            <summary aria-label={`Actions for ${item.title}`}>
              <Ellipsis size={18} aria-hidden="true" />
            </summary>
            <div className="plan-item-menu-panel glass-strong">
              <button
                type="button"
                onClick={(event) => {
                  closeMenu(event.currentTarget);
                  onEdit();
                }}
              >
                Edit details
              </button>
              {link ? (
                <OutboundLink
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noopener noreferrer" : undefined}
                  onClick={(event) => closeMenu(event.currentTarget)}
                >
                  {link.label}
                  {link.external ? (
                    <span className="sr-only"> (opens in a new tab)</span>
                  ) : null}
                </OutboundLink>
              ) : null}
              <button
                type="button"
                className="plan-item-remove"
                onClick={(event) => {
                  closeMenu(event.currentTarget);
                  onRemove();
                }}
              >
                Remove
              </button>
            </div>
          </details>
        }
      />
      {footer ? <div className="plan-timeline-foot">{footer}</div> : null}
    </article>
  );
}
