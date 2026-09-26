import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder for one hotel result row (thumb, name, facts, price). */
function StayResultRowSkeleton() {
  return (
    <li className="ui-list-row ui-list-row-pair">
      <span className="ui-list-leading">
        <Skeleton className="h-12 w-12" />
      </span>
      <span className="ui-list-copy gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-2/5" />
      </span>
      <span className="ui-list-trailing flex flex-col items-end gap-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3 w-10" />
      </span>
    </li>
  );
}

/** Hotel results list while the Nuitee search runs. */
export function StayResultsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="ui-card ui-card-compact ui-list-stack" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <StayResultRowSkeleton key={index} />
      ))}
    </ul>
  );
}

/** Search summary card (destination, dates, Edit). */
export function StaySearchCardSkeleton() {
  return (
    <div className="ui-card ui-card-compact" aria-hidden="true">
      <div className="ui-list-row ui-list-row-pair">
        <span className="ui-list-leading">
          <Skeleton className="h-5 w-5 rounded-full" />
        </span>
        <span className="ui-list-copy gap-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </span>
        <Skeleton className="h-8 w-12" />
      </div>
    </div>
  );
}

/** One room card: photo, name, facts, amenity pills, a rate row with its button. */
export function StayRoomCardSkeleton() {
  return (
    <div className="ui-card ui-card-compact" aria-hidden="true">
      <Skeleton className="book-room-photo" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <Skeleton className="mt-2 h-3 w-2/3" />
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-1/3" />
        </span>
        <span className="flex flex-col items-end gap-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </span>
      </div>
      <div className="mt-2 flex justify-end">
        <Skeleton className="h-11 w-24" />
      </div>
    </div>
  );
}

/** Room list while rates load. */
export function StayRoomsSkeleton({ cards = 2 }: { cards?: number }) {
  return (
    <div className="flex flex-col gap-3 pb-2">
      {Array.from({ length: cards }, (_, index) => (
        <StayRoomCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Short status line announced to screen readers alongside the skeletons. */
export function StayLoadingStatus({ children }: { children: string }) {
  return (
    <p className="text-sm text-muted" role="status">
      {children}
    </p>
  );
}

function FieldSkeleton() {
  return (
    <span className="flex flex-col gap-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-11 w-full" />
    </span>
  );
}

/**
 * Checkout card while the page loads and while Nuitee confirms the rate
 * (prebook): room photo, name and rate lines, price box, guest fields, pay button.
 */
export function StayCheckoutCardSkeleton() {
  return (
    <div className="plan-stack">
      <StayLoadingStatus>Checking your selected room…</StayLoadingStatus>
      <div className="ui-card ui-card-compact flex flex-col gap-3" aria-hidden="true">
        <div className="flex items-center justify-between gap-2">
          <span className="flex flex-col gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-40" />
          </span>
          <Skeleton className="h-11 w-28" />
        </div>
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface-soft">
          <Skeleton className="aspect-[3/2] max-h-[210px] w-full rounded-none md:max-h-[280px]" />
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-start sm:justify-between">
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
              <span className="flex flex-wrap gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </span>
            </span>
            <span className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-3 w-20" />
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="grid gap-2 sm:grid-cols-2">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}

/** Full checkout page skeleton: back link, page title, then the checkout card. */
export function StayCheckoutPageSkeleton() {
  return (
    <main className="book-flow min-h-[70vh] bg-bg pb-16" data-density="compact">
      <div className="section-shell pt-3">
        <div className="mx-auto max-w-5xl">
          <div aria-hidden="true">
            <Skeleton className="my-3 h-4 w-28" />
            <div className="mt-2 flex flex-col gap-2 border-b border-border pb-3">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-4/5 max-w-md" />
            </div>
          </div>
          <div className="py-3">
            <StayCheckoutCardSkeleton />
          </div>
        </div>
      </div>
    </main>
  );
}
