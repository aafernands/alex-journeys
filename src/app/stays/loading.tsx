import { Skeleton } from "@/components/ui/Skeleton";
import {
  StayLoadingStatus,
  StayResultsSkeleton,
  StaySearchCardSkeleton,
} from "@/components/stays/StaySkeletons";

/** Shown while /stays runs the Nuitee hotel search. Mirrors the compact SitePage layout. */
export default function StaysLoading() {
  return (
    <main className="bg-bg plan-page [--carousel-fade:var(--bg)]" data-density="compact">
      <div className="section-shell section-band">
        <div className="plan-page-chrome" aria-hidden="true">
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="mt-2 h-6 w-48" />
        <div className="plan-trip book-flow hub-follow plan-stack">
          <StaySearchCardSkeleton />
          <StayLoadingStatus>Finding stays…</StayLoadingStatus>
          <div aria-hidden="true">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-3 w-56" />
          </div>
          <StayResultsSkeleton />
        </div>
      </div>
    </main>
  );
}
