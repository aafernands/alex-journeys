import Link from "next/link";
import { redirect } from "next/navigation";
import { TripPlannerForm } from "@/components/cms/TripPlannerForm";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import {
  getTripPlannerConfig,
  getTripPlannerPartners,
} from "@/lib/trip-planner";

export const dynamic = "force-dynamic";

export default async function CmsTripPlannerPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/cms"
          className="text-sm text-link transition hover:text-accent"
        >
          ← Dashboard
        </Link>
        <p className="eyebrow mt-6 text-accent">Guides</p>
        <h1 className="font-display mt-2 text-display text-heading">
          Plan a trip
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted md:text-base">
          Copy, flags, and affiliate partners for{" "}
          <Link href="/guides/plan-a-trip" className="text-link hover:text-accent">
            /guides/plan-a-trip
          </Link>
          . Saves commit{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            src/content/trip-planner
          </code>{" "}
          to GitHub. URL templates may include{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            {"{destination}"}
          </code>{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            {"{startDate}"}
          </code>{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            {"{endDate}"}
          </code>{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            {"{origin}"}
          </code>{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            {"{adults}"}
          </code>{" "}
          <code className="rounded bg-surface-soft px-1.5 py-0.5 text-xs">
            {"{rooms}"}
          </code>
          . If a slot has no value, the fallback Tools link is used. Public
          clicks still pass through /out.
        </p>
      </div>
      <TripPlannerForm
        config={getTripPlannerConfig()}
        partners={getTripPlannerPartners()}
      />
    </div>
  );
}
