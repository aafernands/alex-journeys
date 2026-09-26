import { Skeleton } from "@/components/ui/Skeleton";
import {
  StayLoadingStatus,
  StayRoomsSkeleton,
  StaySearchCardSkeleton,
} from "@/components/stays/StaySkeletons";

/** Shown while a hotel's details and live room rates load. Mirrors StayHotelOverview. */
export default function StayHotelLoading() {
  return (
    <main className="book-flow bg-bg pb-16" data-density="compact">
      <div className="section-shell pt-3">
        <div aria-hidden="true">
          <Skeleton className="mb-2 h-4 w-28" />
          <div className="mb-2">
            <StaySearchCardSkeleton />
          </div>
          <Skeleton className="book-hero rounded-[var(--radius-card)]" />
        </div>
        <div className="mx-auto max-w-6xl">
          <div className="border-b border-border py-3" aria-hidden="true">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-6 w-3/4 max-w-md" />
            <Skeleton className="mt-2 h-4 w-1/2 max-w-xs" />
          </div>
          <section className="py-6" aria-label="Rooms">
            <div className="mb-4" aria-hidden="true">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="mt-2 h-6 w-44" />
            </div>
            <div className="mb-3">
              <StayLoadingStatus>Finding rooms…</StayLoadingStatus>
            </div>
            <StayRoomsSkeleton />
          </section>
        </div>
      </div>
    </main>
  );
}
