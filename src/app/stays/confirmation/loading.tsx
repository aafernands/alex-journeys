import { StayLoadingStatus } from "@/components/stays/StaySkeletons";

/** Keeps the /stays results skeleton from flashing on the confirmation page. */
export default function StayConfirmationLoading() {
  return (
    <main className="book-flow bg-bg pb-16" data-density="compact">
      <div className="section-shell section-band">
        <StayLoadingStatus>Loading your reservation…</StayLoadingStatus>
      </div>
    </main>
  );
}
