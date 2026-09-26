"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
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
      <Button variant="primary" disabled={pending} onClick={onRetry}>
        {pending ? "Trying again…" : "Try again"}
      </Button>
    ) : (
      <Link href={listHref} className="btn ui-btn btn-primary">
        Search again
      </Link>
    );

  return (
    <Card density="compact" role="alert" className="flex flex-col gap-2">
      <h2 className="ui-section-title">{failure.title}</h2>
      <p className="ui-field-hint">{failure.message}</p>
      <div className="flex flex-wrap gap-2">
        {primary}
        {failure.recovery === "back-to-search" ? null : (
          <Link href={listHref} className="btn ui-btn btn-secondary">
            Search again
          </Link>
        )}
      </div>
    </Card>
  );
}
