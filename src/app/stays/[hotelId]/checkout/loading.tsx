import { StayCheckoutPageSkeleton } from "@/components/stays/StaySkeletons";
import { StayScrollTop } from "@/components/stays/StayScrollTop";

/** Shown instantly after tapping Select while the checkout route reloads the rate. */
export default function StayCheckoutLoading() {
  return (
    <>
      <StayScrollTop />
      <StayCheckoutPageSkeleton />
    </>
  );
}
