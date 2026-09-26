"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { StayFailure } from "@/lib/stays";

type Props = {
  failure: StayFailure;
  listHref: string;
  pending: boolean;
  onRefreshRooms?: () => void;
  onPickAnother?: () => void;
  onRetry?: () => void;
};

export function StayFailureNotice({
  failure,
  listHref,
  pending,
  onRefreshRooms = () => undefined,
  onPickAnother = () => undefined,
  onRetry = () => undefined,
}: Props) {
  const primary =
    failure.recovery === "refresh-rooms" ? (
      <Button variant="primary" disabled={pending} onClick={onRefreshRooms}>
        {pending ? "Checking rooms…" : "See open rooms"}
      </Button>
    ) : failure.recovery === "retry-book" ? (
      <Button variant="primary" disabled={pending} onClick={onPickAnother}>
        Pick another room
      </Button>
    ) : failure.recovery === "retry" ? (
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
