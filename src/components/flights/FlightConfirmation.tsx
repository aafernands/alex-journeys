"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { FlightConfirmationDetails } from "@/lib/flights";

type Props = {
  confirmation: FlightConfirmationDetails;
  listHref: string;
  planHref: string;
  itinerary: "adding" | "added" | "missing";
  saved?: "account" | "local" | "pending";
  onAddToItinerary?: () => void;
};

function Row({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return <ListRow title={value} detail={label} />;
}

export function FlightConfirmation({
  confirmation,
  listHref,
  planHref,
  itinerary,
  saved = "local",
  onAddToItinerary = () => undefined,
}: Props) {
  const showBookingId = confirmation.bookingId !== confirmation.confirmationCode;
  return (
    <Card density="compact" aria-labelledby="flight-confirmation" className="flex flex-col gap-2">
      <SectionHeader
        id="flight-confirmation"
        title={confirmation.title}
        subtitle={`Reservation confirmed${confirmation.status ? ` · ${confirmation.status}` : ""}`}
      />
      <p className="ui-field-hint">
        Nuitee accepted this {confirmation.sandbox ? "sandbox " : ""}reservation.
      </p>
      <div className="ui-list-stack">
        <Row label="Confirmation" value={confirmation.confirmationCode} />
        {showBookingId ? <Row label="Booking id" value={confirmation.bookingId} /> : null}
        <Row label="Route" value={confirmation.routeLabel} />
        <Row label="Dates" value={confirmation.dateLabel} />
        <Row label="Cabin" value={confirmation.cabin} />
        <Row label="Bags" value={confirmation.baggage} />
        <Row label="Total" value={confirmation.totalLabel} />
        <Row label="Passenger" value={confirmation.passengerName} />
        <Row label="Email" value={confirmation.email} />
      </div>
      {confirmation.conditions.length > 0 ? (
        <ul className="plan-stack-tight text-sm leading-relaxed text-text">
          {confirmation.conditions.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm leading-relaxed text-text" data-payment-method={confirmation.payment.method}>
        {confirmation.payment.label}
      </p>
      {confirmation.sandbox ? (
        <p className="text-sm text-muted">
          In the sandbox, this reservation also appears in the Nuitee dashboard.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        {itinerary === "added" ? (
          <Link href={planHref} className="btn ui-btn btn-primary">
            View on itinerary
          </Link>
        ) : (
          <Button variant="primary" disabled={itinerary === "adding"} onClick={onAddToItinerary}>
            {itinerary === "adding" ? "Adding to itinerary…" : "Add to itinerary"}
          </Button>
        )}
        <Link href={listHref} className="btn ui-btn btn-secondary">
          Search more flights
        </Link>
      </div>
      {itinerary === "adding" ? (
        <p className="text-sm text-muted" role="status">
          Adding this flight to your itinerary…
        </p>
      ) : null}
      {itinerary === "added" ? (
        <p className="text-sm font-semibold text-heading" role="status">
          {saved === "pending"
            ? "This flight is ready for your itinerary. Open the trip to see it."
            : saved === "account"
              ? "This flight is on your itinerary."
              : "Added to the trip open in this browser."}
        </p>
      ) : null}
      {itinerary === "missing" ? (
        <p className="text-sm text-text" role="status">
          This browser doesn’t have that trip open. Add it from Plan a trip, or open the saved trip.
        </p>
      ) : null}
    </Card>
  );
}
