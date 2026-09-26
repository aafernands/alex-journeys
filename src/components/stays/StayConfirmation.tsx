"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ListRow } from "@/components/ui/ListRow";
import { SectionHeader } from "@/components/ui/SectionHeader";
import type { StayConfirmationDetails } from "@/lib/stays";

type Props = {
  confirmation: StayConfirmationDetails;
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

export function StayConfirmation({
  confirmation,
  listHref,
  planHref,
  itinerary,
  saved = "local",
  onAddToItinerary = () => undefined,
}: Props) {
  const showBookingId = confirmation.bookingId !== confirmation.confirmationCode;
  return (
    <Card density="compact" aria-labelledby="stay-confirmation" className="flex flex-col gap-2">
      <SectionHeader
        id="stay-confirmation"
        title={confirmation.hotelName}
        subtitle={`Reservation confirmed${confirmation.status ? ` · ${confirmation.status}` : ""}`}
      />
      <p className="ui-field-hint">
        Nuitee accepted this {confirmation.sandbox ? "sandbox " : ""}reservation.
      </p>
      <div className="ui-list-stack">
        <Row label="Confirmation" value={confirmation.confirmationCode} />
        {showBookingId ? <Row label="Booking id" value={confirmation.bookingId} /> : null}
        <Row label="Dates" value={confirmation.dateLabel} />
        <Row label="Room" value={confirmation.roomName} />
        <Row label="Rate" value={confirmation.rateLabel} />
        <Row label="Total" value={confirmation.totalLabel} />
        <Row label="Guest" value={confirmation.guestName} />
        <Row label="Email" value={confirmation.guestEmail} />
      </div>
      {confirmation.cancellation.length > 0 ? (
        <div className="plan-stack-tight">
          <h3 className="text-base font-semibold text-heading">Cancellation</h3>
          <ul className="plan-stack-tight text-sm leading-relaxed text-text">
            {confirmation.cancellation.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {confirmation.conditions.length > 0 || confirmation.remarks || confirmation.terms ? (
        <div className="plan-stack-tight text-sm leading-relaxed text-text">
          <h3 className="text-base font-semibold text-heading">Before you arrive</h3>
          {confirmation.remarks ? <p>{confirmation.remarks}</p> : null}
          {confirmation.conditions.map((line) => (
            <p key={line}>{line}</p>
          ))}
          {confirmation.terms ? <p>{confirmation.terms}</p> : null}
        </div>
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
          Search more stays
        </Link>
      </div>
      {itinerary === "adding" ? (
        <p className="text-sm text-muted" role="status">
          Adding this stay to your itinerary…
        </p>
      ) : null}
      {itinerary === "added" ? (
        <p className="text-sm font-semibold text-heading" role="status">
          {saved === "pending"
            ? "This stay is ready for your itinerary. Open the trip to see the hotel."
            : saved === "account"
              ? "This stay is on your itinerary."
              : "Added to the trip open in this browser."}
        </p>
      ) : null}
      {itinerary === "missing" ? (
        <p className="text-sm text-text" role="status">
          There’s no trip open in this browser yet. Start one in Plan a Trip, then add the stay.
        </p>
      ) : null}
    </Card>
  );
}
