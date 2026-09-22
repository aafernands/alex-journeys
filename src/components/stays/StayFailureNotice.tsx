import Link from "next/link";
import type { StayFailure } from "@/lib/stays";

type Props = {
  failure: StayFailure;
  listHref: string;
  pending: boolean;
  onRefreshRooms: () => void;
  onPickAnother: () => void;
  onRetry: () => void;
};

export function StayFailureNotice({
  failure,
  listHref,
  pending,
  onRefreshRooms,
  onPickAnother,
  onRetry,
}: Props) {
  const primary =
    failure.recovery === "refresh-rooms" ? (
      <button type="button" className="btn btn-primary" disabled={pending} onClick={onRefreshRooms}>
        {pending ? "Checking rooms…" : "See open rooms"}
      </button>
    ) : failure.recovery === "retry-book" ? (
      <button type="button" className="btn btn-primary" disabled={pending} onClick={onPickAnother}>
        Pick another room
      </button>
    ) : failure.recovery === "retry" ? (
      <button type="button" className="btn btn-primary" disabled={pending} onClick={onRetry}>
        {pending ? "Trying again…" : "Try again"}
      </button>
    ) : (
      <Link href={listHref} className="btn btn-primary">
        Search again
      </Link>
    );

  return (
    <div className="panel plan-inset plan-stack p-5" role="alert">
      <h2 className="font-display text-xl font-bold text-heading">{failure.title}</h2>
      <p className="text-sm leading-relaxed text-text">{failure.message}</p>
      <div className="flex flex-wrap gap-3">
        {primary}
        {failure.recovery === "back-to-search" ? null : (
          <Link href={listHref} className="btn btn-secondary">
            Search again
          </Link>
        )}
      </div>
    </div>
  );
}
