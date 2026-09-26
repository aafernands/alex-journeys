/**
 * CMS Members view: types and pure helpers. Safe for the admin client bundle.
 * Rows never carry Stripe subscription ids or keys, only a dashboard link.
 */
import type { MembershipStatus, PremiumPlan } from "@/lib/membership";

export type MemberBadge =
  | "trial"
  | "active"
  | "past_due"
  | "canceling"
  | "canceled"
  | "incomplete"
  | "paused";

export type MemberFilter = "all" | "active" | "trial" | "past_due" | "canceled";

export type MemberRow = {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  plan: PremiumPlan | null;
  status: MembershipStatus;
  badge: MemberBadge;
  cancelAtPeriodEnd: boolean;
  /** Subscription start from Stripe, else the account creation date. */
  memberSince: string | null;
  memberSinceFromStripe: boolean;
  /** Trial end, renewal, or end date. */
  nextDate: string | null;
  nextDateLabel: string | null;
  stripeUrl: string | null;
  canRefresh: boolean;
};

export type MembersSummary = {
  activeTotal: number;
  trialing: number;
  pastDue: number;
  canceling: number;
  canceled: number;
  /** Paying members only (active, not in a trial). */
  mrrCents: number;
  /** Including members currently in a free trial. */
  mrrWithTrialsCents: number;
};

export const MEMBER_FILTERS: { id: MemberFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "trial", label: "Trial" },
  { id: "past_due", label: "Past due" },
  { id: "canceled", label: "Canceled" },
];

export const BADGE_LABEL: Record<MemberBadge, string> = {
  trial: "Trial",
  active: "Active",
  past_due: "Past due",
  canceling: "Canceling",
  canceled: "Canceled",
  incomplete: "Incomplete",
  paused: "Paused",
};

export function memberBadge(status: MembershipStatus, cancelAtPeriodEnd: boolean): MemberBadge {
  if (status === "canceled" || status === "incomplete_expired") return "canceled";
  if (status === "past_due" || status === "unpaid") return "past_due";
  if (status === "paused") return "paused";
  if (status === "incomplete" || status === "none") return "incomplete";
  if (cancelAtPeriodEnd) return "canceling";
  return status === "trialing" ? "trial" : "active";
}

export function matchesFilter(row: MemberRow, filter: MemberFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "active":
      return row.status === "active";
    case "trial":
      return row.status === "trialing";
    case "past_due":
      return row.status === "past_due" || row.status === "unpaid";
    case "canceled":
      return row.status === "canceled" || row.status === "incomplete_expired";
  }
}

export function matchesSearch(row: MemberRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    row.email.toLowerCase().includes(q) || (row.name ?? "").toLowerCase().includes(q)
  );
}

export function nextDateFor(input: {
  status: MembershipStatus;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
}): { date: string | null; label: string | null } {
  const { status, cancelAtPeriodEnd, trialEnd, currentPeriodEnd } = input;
  if (status === "canceled" || status === "incomplete_expired") {
    return { date: currentPeriodEnd, label: currentPeriodEnd ? "Ended" : null };
  }
  if (status === "trialing" && !cancelAtPeriodEnd) {
    const date = trialEnd ?? currentPeriodEnd;
    return { date, label: date ? "Trial ends" : null };
  }
  if (cancelAtPeriodEnd) {
    const date = status === "trialing" ? trialEnd ?? currentPeriodEnd : currentPeriodEnd;
    return { date, label: date ? "Ends" : null };
  }
  return { date: currentPeriodEnd, label: currentPeriodEnd ? "Renews" : null };
}

export function summarizeMembers(
  rows: Pick<MemberRow, "status" | "plan" | "cancelAtPeriodEnd">[],
  prices: { monthlyCents: number; yearlyCents: number },
): MembersSummary {
  const summary: MembersSummary = {
    activeTotal: 0,
    trialing: 0,
    pastDue: 0,
    canceling: 0,
    canceled: 0,
    mrrCents: 0,
    mrrWithTrialsCents: 0,
  };
  for (const row of rows) {
    const monthly =
      row.plan === "monthly"
        ? prices.monthlyCents
        : row.plan === "yearly"
          ? prices.yearlyCents / 12
          : 0;
    if (row.status === "active" || row.status === "trialing") {
      summary.activeTotal += 1;
      summary.mrrWithTrialsCents += monthly;
      if (row.status === "active") summary.mrrCents += monthly;
      if (row.status === "trialing") summary.trialing += 1;
      if (row.cancelAtPeriodEnd) summary.canceling += 1;
    } else if (row.status === "past_due" || row.status === "unpaid") {
      summary.pastDue += 1;
    } else if (row.status === "canceled" || row.status === "incomplete_expired") {
      summary.canceled += 1;
    }
  }
  summary.mrrCents = Math.round(summary.mrrCents);
  summary.mrrWithTrialsCents = Math.round(summary.mrrWithTrialsCents);
  return summary;
}

export function stripeCustomerUrl(customerId: string | null, secretKey: string): string | null {
  if (!customerId || !/^cus_[A-Za-z0-9]+$/.test(customerId)) return null;
  const test = secretKey.trim().startsWith("sk_test_") || secretKey.trim().startsWith("rk_test_");
  return `https://dashboard.stripe.com/${test ? "test/" : ""}customers/${customerId}`;
}

function csvCell(raw: string): string {
  // Neutralize spreadsheet formulas in user-controlled names.
  const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function membersCsv(rows: MemberRow[]): string {
  const header = [
    "Name",
    "Email",
    "Plan",
    "Status",
    "Member since",
    "Next date",
    "Next date type",
  ];
  const lines = rows.map((row) =>
    [
      row.name ?? "",
      row.email,
      row.plan === "yearly" ? "Yearly" : row.plan === "monthly" ? "Monthly" : "",
      BADGE_LABEL[row.badge],
      row.memberSince?.slice(0, 10) ?? "",
      row.nextDate?.slice(0, 10) ?? "",
      row.nextDateLabel ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}
