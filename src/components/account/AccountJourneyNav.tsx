"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { AccountSection } from "@/lib/account-section";

export type JourneyNavItem = {
  id: AccountSection;
  label: string;
  icon: LucideIcon;
  /** Small count badge. Null hides it (unknown or not a countable section). */
  count: number | null;
};

type Props = {
  items: JourneyNavItem[];
  active: AccountSection;
  onSelect: (id: AccountSection) => void;
  /** `sidebar` on desktop, `list` is the drawer-style list on mobile. */
  variant: "sidebar" | "list";
};

function CountBadge({ count, active }: { count: number | null; active: boolean }) {
  if (count === null || count === 0) return null;
  return (
    <span
      className={`inline-flex min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-ds-caption font-semibold tabular-nums ${
        active ? "bg-accent text-on-solid" : "bg-surface-soft text-heading"
      }`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

/**
 * My Journey section navigation. Mobile shows a drawer-style list (hairline
 * rows, chevrons) on the overview; desktop keeps it as a sticky sidebar.
 */
export function AccountJourneyNav({ items, active, onSelect, variant }: Props) {
  if (variant === "list") {
    return (
      <nav aria-label="My Journey sections" className="ui-card overflow-hidden p-0">
        <ul className="divide-y divide-border">
          {items.map(({ id, label, icon: Icon, count }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                className="flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm font-medium text-heading transition hover:bg-surface-soft"
              >
                <Icon className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <CountBadge count={count} active={false} />
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="My Journey sections">
      <ul className="space-y-0.5">
        {items.map(({ id, label, icon: Icon, count }) => {
          const current = id === active;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-control)] px-3 text-left text-sm transition ${
                  current
                    ? "bg-white font-semibold text-heading shadow-[inset_3px_0_0_var(--accent)] ring-1 ring-border"
                    : "font-medium text-muted hover:bg-white/70 hover:text-heading"
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${current ? "text-accent" : ""}`}
                  strokeWidth={2}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                <CountBadge count={count} active={current} />
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
