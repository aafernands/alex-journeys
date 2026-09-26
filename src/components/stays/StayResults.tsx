import { ListRow } from "@/components/ui/ListRow";
import {
  formatStayMoney,
  formatStayRating,
  staysHotelPath,
  type StayListItem,
  type StaysQuery,
} from "@/lib/stays";

function stayFacts(stay: StayListItem): string {
  const stars = Math.max(0, Math.min(5, Math.round(stay.stars ?? 0)));
  const rating = formatStayRating(stay.rating);
  return [
    [stay.neighborhood, stay.city].filter(Boolean).join(" · "),
    stars > 0 ? `${stars}-star` : "",
    rating ? `${rating} guest rating` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function StayResults({ stays, query }: { stays: StayListItem[]; query: StaysQuery }) {
  return (
    <ul className="ui-card ui-card-compact ui-list-stack">
      {stays.map((stay) => {
        const price = stay.fromPrice ? formatStayMoney(stay.fromPrice) : "On request";
        return (
          <li key={stay.id}>
            <ListRow
              className="book-hit"
              href={staysHotelPath(stay.id, query)}
              leading={
                stay.photo ? (
                  // Hotel CDNs are not a fixed host list, so this stays a plain image.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stay.photo} alt="" className="book-thumb" />
                ) : (
                  <span className="book-thumb" aria-hidden="true" />
                )
              }
              title={stay.name}
              detail={stayFacts(stay) || "Stay"}
              trailing={
                <span className="book-price">
                  {price}
                  <small>total</small>
                </span>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
