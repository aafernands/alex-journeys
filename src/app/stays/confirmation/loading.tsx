import { StayLoadingStatus } from "@/components/stays/StaySkeletons";
import { StayScrollTop } from "@/components/stays/StayScrollTop";

/** Keeps the /stays results skeleton from flashing on the confirmation page. */
export default function StayConfirmationLoading() {
  return (
    <main className="book-flow min-h-[70vh] bg-bg pb-16" data-density="compact">
      <StayScrollTop />
      <div className="section-shell section-band">
        <StayLoadingStatus>Loading your reservation…</StayLoadingStatus>
      </div>
    </main>
  );
}
