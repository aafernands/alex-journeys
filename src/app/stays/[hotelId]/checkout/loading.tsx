import { StayLoadingStatus } from "@/components/stays/StaySkeletons";

/** Checkout reloads the selected rate; a status line reads better than a skeleton here. */
export default function StayCheckoutLoading() {
  return (
    <main className="book-flow bg-bg pb-16" data-density="compact">
      <div className="section-shell pt-3">
        <div className="mx-auto max-w-5xl">
          <div className="ui-card ui-card-compact mt-3">
            <StayLoadingStatus>Checking your selected room…</StayLoadingStatus>
          </div>
        </div>
      </div>
    </main>
  );
}
