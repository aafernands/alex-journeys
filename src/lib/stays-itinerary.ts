import { getActivePlanSnapshot, writeActivePlan } from "@/lib/trip-planner-storage";
import { createTripItem } from "@/lib/trip-record";

export function addBookedStayToActivePlan(input: {
  hotelName: string;
  confirmation: string;
  notes: string;
  href: string;
}): { ok: true } | { ok: false; reason: "no-plan" } {
  const plan = getActivePlanSnapshot();
  if (!plan || !plan.state.destination.trim()) return { ok: false, reason: "no-plan" };
  const confirmation = input.confirmation.trim();
  const already = plan.items.some(
    (item) => item.type === "hotel" && item.confirmation && item.confirmation === confirmation,
  );
  if (already) return { ok: true };
  const sortOrder =
    plan.items.reduce((max, item) => Math.max(max, item.sortOrder), -1) + 1;
  const item = createTripItem({
    type: "hotel",
    title: input.hotelName,
    url: input.href.startsWith("/") ? input.href : "",
    notes: input.notes,
    confirmation,
    status: "booked",
    laneKey: "booking",
    sortOrder,
  });
  writeActivePlan({ ...plan, step: 4, items: [...plan.items, item] });
  return { ok: true };
}
