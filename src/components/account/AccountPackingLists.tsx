import Link from "next/link";
import { ListChecks } from "lucide-react";
import type { AccountPackingRow } from "@/lib/account-journey";
import { planATripHref } from "@/lib/trip-record";

type Props = { lists: AccountPackingRow[] };

/** Packing progress per saved trip. Opens the trip in Plan a Trip. */
export function AccountPackingLists({ lists }: Props) {
  if (lists.length === 0) {
    return (
      <p className="text-sm text-muted">
        No packing lists yet. Open a trip and add one from its Packing tab.
      </p>
    );
  }
  return (
    <ul className="ui-card divide-y divide-border p-0">
      {lists.map((list) => {
        const pct = list.total ? Math.round((list.packed / list.total) * 100) : 0;
        return (
          <li key={list.tripId}>
            <Link
              href={planATripHref(list.tripId)}
              className="flex min-h-12 items-center gap-3 px-3 py-2 transition hover:bg-surface-soft"
            >
              <ListChecks className="h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-heading">
                  {list.tripTitle}
                </span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {list.packed}/{list.total} packed
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
