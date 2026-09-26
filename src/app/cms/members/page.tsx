import { redirect } from "next/navigation";
import { MembersDashboard } from "@/components/cms/MembersDashboard";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { loadMembers } from "@/lib/cms/members";
import { formatUsd, premiumPrices } from "@/lib/membership";

export const dynamic = "force-dynamic";

export default async function CmsMembersPage() {
  if (!(await isCmsAuthenticated())) {
    redirect("/cms");
  }
  const load = await loadMembers();
  const prices = premiumPrices();

  return (
    <MembersDashboard
      rows={load.rows}
      summary={load.summary}
      notices={load.notices}
      unavailable={load.unavailable}
      priceNote={`${formatUsd(prices.monthlyCents)}/mo · ${formatUsd(prices.yearlyCents)}/yr`}
    />
  );
}
