import { OutboundLink } from "@/components/outbound/OutboundLink";

type Props = {
  bookingHref: string;
  expediaHref: string;
};

export function StayCompareLinks({ bookingHref, expediaHref }: Props) {
  if (!bookingHref && !expediaHref) return null;
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
      {bookingHref ? (
        <OutboundLink href={bookingHref} affiliate className="text-link hover:text-accent">
          Compare on Booking
          <span className="sr-only"> (opens in a new tab)</span>
        </OutboundLink>
      ) : null}
      {expediaHref ? (
        <OutboundLink href={expediaHref} affiliate className="text-link hover:text-accent">
          Compare on Expedia
          <span className="sr-only"> (opens in a new tab)</span>
        </OutboundLink>
      ) : null}
    </p>
  );
}
