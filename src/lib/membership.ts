/**
 * Premium membership: display prices, Stripe snapshot mapping, and `isPremium`.
 * Safe for client and server. Persistence lives in membership-store.ts.
 *
 * Launch perks that are listed on /premium and not built yet:
 * TODO(premium): member hotel rates — do not gate booking. Wire a member rate
 *   when Alex has a LiteAPI/Nuitee rate code. Label stays "Coming soon".
 * TODO(premium): weekly deal email for Newark, JFK, and Philadelphia departures.
 *   No send job yet. Hook: PREMIUM_PERKS id "deal-email".
 * TODO(premium): Alex's Lightroom presets. No files or download route yet.
 *   Hook: PREMIUM_PERKS id "lightroom-presets".
 * TODO(premium): downloadable PDF guides. Trip PDF export already exists for
 *   saved trips; a member guide library does not. Hook: id "pdf-guides".
 * TODO(premium): premium trip planner (unlimited trips, collaborators, offline
 *   export). Saved trips still stop at MAX_SAVED_TRIPS in trip-record.ts.
 *   Hook: id "trip-planner".
 */

export const PREMIUM_EXAMPLE_PATH = "/a-note-for-members";

export const DEFAULT_MONTHLY_CENTS = 999;
export const DEFAULT_YEARLY_CENTS = 9900;
const MAX_DISPLAY_CENTS = 100_000_00;
const MAX_TRIAL_DAYS = 90;

export const MEMBERSHIP_STATUSES = [
  "none",
  "incomplete",
  "incomplete_expired",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "paused",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];
export type PremiumPlan = "monthly" | "yearly";

/** Fields safe to send to the browser. No Stripe ids. */
export type MembershipPublic = {
  status: MembershipStatus;
  plan: PremiumPlan | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
};

/** Stored on `users/{userId}.membership` in Firestore. */
export type MembershipRecord = MembershipPublic & {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  priceId: string | null;
  /** Unix-ms ISO of the Stripe event that last wrote this record. */
  stripeEventAt: string | null;
};

export const EMPTY_MEMBERSHIP: MembershipPublic = {
  status: "none",
  plan: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  trialEnd: null,
};

export type PremiumPerk = {
  id: string;
  title: string;
  detail: string;
  comingSoon?: boolean;
};

export const PREMIUM_PERKS: PremiumPerk[] = [
  {
    id: "hotel-rates",
    title: "Member hotel rates",
    detail: "A member rate on stays, once it is ready. Booking stays open to everyone today.",
    comingSoon: true,
  },
  {
    id: "trip-planner",
    title: "Premium trip planner",
    detail: "Unlimited trips, collaborators, and PDF or offline export.",
  },
  {
    id: "pdf-guides",
    title: "Guides and member stories",
    detail: "Downloadable PDF guides, plus stories that stay with members.",
  },
  {
    id: "deal-email",
    title: "Weekly travel deals",
    detail: "A weekly note on deals leaving Newark, JFK, and Philadelphia.",
  },
  {
    id: "lightroom-presets",
    title: "Alex’s Lightroom presets",
    detail: "The presets Alex uses when the light on the road is doing something interesting.",
  },
];

export type PremiumPrices = {
  monthlyCents: number;
  yearlyCents: number;
  monthlyLabel: string;
  yearlyLabel: string;
  yearlyPerMonthLabel: string;
  savingsCents: number;
  savingsLabel: string;
  savingsPercent: number;
};

export type PremiumPriceIds = {
  monthly: string;
  yearly: string;
};

function readCents(raw: string | undefined, fallback: number): number {
  const trimmed = raw?.trim() ?? "";
  if (!trimmed || !/^\d+$/.test(trimmed)) return fallback;
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value > MAX_DISPLAY_CENTS) return fallback;
  return value;
}

/** Whole dollars drop the cents. $9.99 stays $9.99. $99.00 is $99. */
export function formatUsd(cents: number): string {
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  const dollars = Math.floor(abs / 100);
  const remainder = abs % 100;
  const body =
    remainder === 0 ? String(dollars) : `${dollars}.${String(remainder).padStart(2, "0")}`;
  return `${sign}$${body}`;
}

export function yearlyPerMonthCents(yearlyCents: number): number {
  return Math.round(yearlyCents / 12);
}

/** Display prices. Defaults are $9.99/month and $99/year. */
export function premiumPrices(env: NodeJS.ProcessEnv = process.env): PremiumPrices {
  const monthlyCents = readCents(env.PREMIUM_PRICE_MONTHLY_CENTS, DEFAULT_MONTHLY_CENTS);
  const yearlyCents = readCents(env.PREMIUM_PRICE_YEARLY_CENTS, DEFAULT_YEARLY_CENTS);
  const savingsCents = Math.max(0, monthlyCents * 12 - yearlyCents);
  const full = monthlyCents * 12;
  const savingsPercent = full > 0 ? Math.round((savingsCents / full) * 100) : 0;
  return {
    monthlyCents,
    yearlyCents,
    monthlyLabel: formatUsd(monthlyCents),
    yearlyLabel: formatUsd(yearlyCents),
    yearlyPerMonthLabel: formatUsd(yearlyPerMonthCents(yearlyCents)),
    savingsCents,
    savingsLabel: formatUsd(savingsCents),
    savingsPercent,
  };
}

export function premiumPriceIds(env: NodeJS.ProcessEnv = process.env): PremiumPriceIds {
  return {
    monthly: env.STRIPE_PREMIUM_PRICE_MONTHLY?.trim() ?? "",
    yearly: env.STRIPE_PREMIUM_PRICE_YEARLY?.trim() ?? "",
  };
}

/** Checkout can run when the secret and both Premium price ids are set. */
export function isPremiumCheckoutConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const key = env.STRIPE_SECRET_KEY?.trim() ?? "";
  const prices = premiumPriceIds(env);
  return Boolean(key && prices.monthly && prices.yearly);
}

/** 0 means no trial. Set STRIPE_PREMIUM_TRIAL_DAYS=7 to offer a week. */
export function premiumTrialDays(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.STRIPE_PREMIUM_TRIAL_DAYS?.trim() ?? "";
  if (!raw || !/^\d+$/.test(raw)) return 0;
  const days = Number(raw);
  if (days <= 0) return 0;
  return Math.min(days, MAX_TRIAL_DAYS);
}

export function cleanUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  if (!id || id.length > 128 || id.includes("/") || id.includes("\\")) return null;
  return id;
}

function isStatus(value: unknown): value is MembershipStatus {
  return typeof value === "string" && (MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}

function isPlan(value: unknown): value is PremiumPlan {
  return value === "monthly" || value === "yearly";
}

function isoOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toISOString();
}

export function parseMembership(raw: unknown): MembershipRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as Record<string, unknown>;
  const status = isStatus(data.status) ? data.status : "none";
  if (status === "none" && !data.stripeCustomerId && !data.stripeSubscriptionId) {
    return null;
  }
  return {
    status,
    plan: isPlan(data.plan) ? data.plan : null,
    currentPeriodEnd: isoOrNull(data.currentPeriodEnd),
    cancelAtPeriodEnd: data.cancelAtPeriodEnd === true,
    trialEnd: isoOrNull(data.trialEnd),
    stripeCustomerId:
      typeof data.stripeCustomerId === "string" && data.stripeCustomerId.trim()
        ? data.stripeCustomerId.trim()
        : null,
    stripeSubscriptionId:
      typeof data.stripeSubscriptionId === "string" && data.stripeSubscriptionId.trim()
        ? data.stripeSubscriptionId.trim()
        : null,
    priceId: typeof data.priceId === "string" && data.priceId.trim() ? data.priceId.trim() : null,
    stripeEventAt: isoOrNull(data.stripeEventAt),
  };
}

export function toMembershipPublic(record: MembershipRecord | null): MembershipPublic {
  if (!record) return { ...EMPTY_MEMBERSHIP };
  return {
    status: record.status,
    plan: record.plan,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    trialEnd: record.trialEnd,
  };
}

/**
 * True when the reader’s membership is active or in a trial on a Premium price.
 * `user` is anything with an optional membership (a Firestore profile, or `{ membership }`).
 */
export function isPremium(
  user: { membership?: MembershipPublic | null } | null | undefined,
): boolean {
  const membership = user?.membership;
  if (!membership) return false;
  if (membership.plan !== "monthly" && membership.plan !== "yearly") return false;
  return membership.status === "active" || membership.status === "trialing";
}

export function planLabel(plan: PremiumPlan | null): string | null {
  if (plan === "monthly") return "Monthly";
  if (plan === "yearly") return "Yearly";
  return null;
}

export function statusLabel(status: MembershipStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Free trial";
    case "past_due":
      return "Payment due";
    case "canceled":
      return "Canceled";
    case "unpaid":
      return "Unpaid";
    case "paused":
      return "Paused";
    case "incomplete":
    case "incomplete_expired":
      return "Not finished";
    default:
      return "Not a member";
  }
}

export function formatMembershipDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Renewal, trial end, or cancel date for the account Membership section. */
export function membershipDetail(membership: MembershipPublic | null): string | null {
  if (!membership || membership.status === "none") return null;
  const renews = formatMembershipDate(membership.currentPeriodEnd);
  const trial = formatMembershipDate(membership.trialEnd);
  if (membership.status === "trialing") {
    const until = trial || renews;
    return until ? `Free trial until ${until}` : "Free trial";
  }
  if (membership.status === "active" && membership.cancelAtPeriodEnd) {
    return renews ? `Ends ${renews}` : "Cancels at the end of this period";
  }
  if (membership.status === "active") {
    return renews ? `Renews ${renews}` : "Renews automatically";
  }
  if (membership.status === "past_due") {
    return "Update your card to keep Premium.";
  }
  if (membership.status === "canceled" && renews) {
    return `Ended ${renews}`;
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function idOf(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  const record = asRecord(value);
  if (record && typeof record.id === "string" && record.id.trim()) return record.id.trim();
  return null;
}

function unixToIso(value: unknown): string | null {
  const seconds = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  return new Date(seconds * 1000).toISOString();
}

function mapStatus(value: unknown): MembershipStatus {
  return isStatus(value) ? value : "none";
}

function priceIdFromItem(item: unknown): string | null {
  const record = asRecord(item);
  if (!record) return null;
  const price = asRecord(record.price) ?? (typeof record.price === "string" ? null : null);
  const fromPrice = idOf(record.price);
  if (fromPrice && fromPrice.startsWith("price_")) return fromPrice;
  if (price && typeof price.id === "string") return price.id;
  const plan = idOf(record.plan);
  if (plan) return plan;
  return fromPrice;
}

function planForPrice(priceId: string | null, priceIds: PremiumPriceIds): PremiumPlan | null {
  if (!priceId) return null;
  if (priceIds.monthly && priceId === priceIds.monthly) return "monthly";
  if (priceIds.yearly && priceId === priceIds.yearly) return "yearly";
  return null;
}

export type SubscriptionSync = {
  userId: string | null;
  customerId: string;
  membership: MembershipRecord;
  /** Buyer email from on-site checkout metadata, when set. Lowercased. */
  email?: string | null;
};

/** Loose email check shared by the on-site checkout form and its API. */
export const PREMIUM_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function cleanPremiumEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !PREMIUM_EMAIL_PATTERN.test(email)) return null;
  return email;
}

/**
 * On-site checkout with a trial starts the subscription as `trialing` with a
 * pending SetupIntent. Until the card is saved it is not a membership.
 */
export function awaitingTrialPaymentMethod(subscription: unknown): boolean {
  const record = asRecord(subscription);
  if (!record || record.status !== "trialing") return false;
  if (!idOf(record.pending_setup_intent)) return false;
  return !idOf(record.default_payment_method);
}

/** Map a Stripe Subscription (current or older API shape) onto a membership record. */
export function membershipFromSubscription(
  subscription: unknown,
  priceIds: PremiumPriceIds,
): SubscriptionSync | null {
  const record = asRecord(subscription);
  if (!record) return null;
  const id = idOf(record.id) ?? (typeof record.id === "string" ? record.id : null);
  const customerId = idOf(record.customer);
  if (!id || !customerId) return null;

  const items = asRecord(record.items);
  const data = Array.isArray(items?.data) ? items.data : [];
  const first = data[0];
  const priceId = priceIdFromItem(first);
  const periodEnd =
    unixToIso(asRecord(first)?.current_period_end) ?? unixToIso(record.current_period_end);
  const metadata = asRecord(record.metadata);
  const userId = cleanUserId(metadata?.userId);

  const email = cleanPremiumEmail(metadata?.email);

  const membership: MembershipRecord = {
    status: awaitingTrialPaymentMethod(record) ? "incomplete" : mapStatus(record.status),
    plan: planForPrice(priceId, priceIds),
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: record.cancel_at_period_end === true,
    trialEnd: unixToIso(record.trial_end),
    stripeCustomerId: customerId,
    stripeSubscriptionId: id,
    priceId,
    stripeEventAt: null,
  };

  return { userId, customerId, membership, email };
}

/**
 * Apply a subscription snapshot only when it is this Premium product,
 * or an update to the subscription we already stored.
 */
export function subscriptionAppliesToMember(
  next: MembershipRecord,
  existing: MembershipRecord | null,
): boolean {
  if (next.plan === "monthly" || next.plan === "yearly") return true;
  if (
    existing?.stripeSubscriptionId &&
    existing.stripeSubscriptionId === next.stripeSubscriptionId
  ) {
    return true;
  }
  return false;
}

/** Ignore a webhook that is older than the record we already stored. */
export function isStaleStripeEvent(
  existing: MembershipRecord | null,
  eventCreatedSeconds: number,
): boolean {
  if (!existing?.stripeEventAt) return false;
  if (!Number.isFinite(eventCreatedSeconds)) return false;
  const prev = Date.parse(existing.stripeEventAt);
  if (Number.isNaN(prev)) return false;
  return eventCreatedSeconds * 1000 < prev;
}

export function withStripeEvent(
  membership: MembershipRecord,
  eventCreatedSeconds: number,
): MembershipRecord {
  if (!Number.isFinite(eventCreatedSeconds) || eventCreatedSeconds <= 0) return membership;
  return {
    ...membership,
    stripeEventAt: new Date(eventCreatedSeconds * 1000).toISOString(),
  };
}

/**
 * invoice.payment_failed. A free trial is left alone. A later subscription
 * update can restore active if Stripe collects the invoice.
 */
export function membershipAfterPaymentFailed(current: MembershipRecord): MembershipRecord {
  if (
    current.status === "canceled" ||
    current.status === "incomplete_expired" ||
    current.status === "trialing" ||
    current.status === "none"
  ) {
    return current;
  }
  return { ...current, status: "past_due" };
}

export function readCheckoutSession(session: unknown): {
  userId: string | null;
  customerId: string | null;
  subscriptionId: string | null;
  mode: string | null;
  complete: boolean;
} | null {
  const record = asRecord(session);
  if (!record) return null;
  const metadata = asRecord(record.metadata);
  const userId = cleanUserId(metadata?.userId) ?? cleanUserId(record.client_reference_id);
  return {
    userId,
    customerId: idOf(record.customer),
    subscriptionId: idOf(record.subscription),
    mode: typeof record.mode === "string" ? record.mode : null,
    complete: record.status === "complete",
  };
}

export function readInvoiceRefs(invoice: unknown): {
  customerId: string | null;
  subscriptionId: string | null;
} | null {
  const record = asRecord(invoice);
  if (!record) return null;
  const customerId = idOf(record.customer);
  let subscriptionId = idOf(record.subscription);
  const parent = asRecord(record.parent);
  const details = asRecord(parent?.subscription_details);
  if (!subscriptionId) subscriptionId = idOf(details?.subscription);
  if (!customerId && !subscriptionId) return null;
  return { customerId, subscriptionId };
}
