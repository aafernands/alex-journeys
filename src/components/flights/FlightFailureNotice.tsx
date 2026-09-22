"use client";

import Link from "next/link";
import type { FlightFailure } from "@/lib/flights";

type Props = {
  failure: FlightFailure;
  listHref: string;
  pending: boolean;
  onRetry?: () => void;
};

export function FlightFailureNotice({
  failure,
  listHref,
  pending,
  onRetry = () => undefined,
}: Props) {
  const primary =
    failure.recovery === "retry" || failure.recovery === "accept-price" ? (
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
