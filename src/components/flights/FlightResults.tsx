import { ListRow } from "@/components/ui/ListRow";
import {
  flightDayOffset,
  flightsBookPath,
  formatFlightClock,
  formatFlightDuration,
  formatFlightMoney,
  stopsLabel,
  type FlightOffer,
  type FlightsQuery,
} from "@/lib/flights";

function flightTitle(offer: FlightOffer): string {
  const offset = flightDayOffset(offer.departureTime, offer.arrivalTime);
  const depart = formatFlightClock(offer.departureTime) || offer.originCode;
  const arrive = formatFlightClock(offer.arrivalTime) || offer.destinationCode;
  return `${depart} – ${arrive}${offset > 0 ? ` +${offset}` : ""}`;
}

function flightDetail(offer: FlightOffer): string {
  return [
    offer.airline,
    offer.cheapest ? "Cheapest" : "",
    formatFlightDuration(offer.durationMinutes),
    stopsLabel(offer.outboundStops),
    offer.cabin,
    offer.baggage,
    offer.returnDepartureTime
      ? `return ${formatFlightClock(offer.returnDepartureTime) || "scheduled"}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function FlightResults({ offers, query }: { offers: FlightOffer[]; query: FlightsQuery }) {
  return (
    <ul className="ui-card ui-card-compact ui-list-stack">
      {offers.map((offer) => (
        <li key={offer.offerId}>
          <ListRow
            className="book-hit"
            href={flightsBookPath(offer.offerId, query)}
            title={flightTitle(offer)}
            detail={flightDetail(offer)}
            trailing={
              <span className="book-price">
                {offer.price ? formatFlightMoney(offer.price) : "On request"}
                <small>total</small>
              </span>
            }
          />
        </li>
      ))}
    </ul>
  );
}
