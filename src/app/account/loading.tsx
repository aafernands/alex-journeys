import { Skeleton } from "@/components/ui/Skeleton";

/** My Journey placeholder while trips, saved items, and the profile load. */
export default function AccountLoading() {
  return (
    <main className="account-page bg-bg" data-density="compact">
      <div className="section-shell section-band">
        <div className="mx-auto max-w-5xl md:grid md:grid-cols-[14rem_minmax(0,1fr)] md:gap-6">
          <div className="hidden space-y-1 md:block" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="block h-11 w-full" />
            ))}
          </div>
          <div className="min-w-0 space-y-4" role="status">
            <span className="sr-only">Loading My Journey…</span>
            <Skeleton className="block h-6 w-32" />
            <div className="ui-card space-y-3 p-3" aria-hidden="true">
              <div className="flex items-center gap-3">
                <Skeleton className="block h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="block h-5 w-1/2" />
                  <Skeleton className="block h-3 w-1/4" />
                </div>
              </div>
              <Skeleton className="block h-11 w-full" />
            </div>
            <Skeleton className="block h-16 w-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
