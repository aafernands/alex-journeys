import {
  normalizeConfig,
  normalizePartner,
  PARTNER_SHOW_WHEN,
  type TripPlannerConfig,
  type TripPlannerPartner,
} from "@/lib/trip-planner-model";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function requiredString(
  value: unknown,
  label: string,
  max: number,
): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string" || !value.trim()) {
    return { ok: false, error: `${label} is required.` };
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    return { ok: false, error: `${label} max is ${max} characters.` };
  }
  return { ok: true, value: trimmed };
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isTemplateUrl(value: string): boolean {
  if (!/^https?:\/\//i.test(value)) return false;
  if (!value.includes("{")) return isHttpUrl(value);
  const blanked = value.replace(/\{[a-zA-Z]+\}/g, "x");
  return isHttpUrl(blanked);
}

export function validateTripPlannerInput(
  input: unknown,
):
  | { ok: true; config: TripPlannerConfig; partners: TripPlannerPartner[] }
  | { ok: false; error: string } {
  const body = asRecord(input);
  if (!body) return { ok: false, error: "Invalid trip planner payload." };

  const configIn = asRecord(body.config);
  if (!configIn) return { ok: false, error: "Config is required." };

  const title = requiredString(configIn.title, "Title", 120);
  if (!title.ok) return title;
  const intro = requiredString(configIn.intro, "Intro", 400);
  if (!intro.ok) return intro;
  const guidesHeading = requiredString(
    configIn.guidesHeading,
    "Journal heading",
    120,
  );
  if (!guidesHeading.ok) return guidesHeading;
  const disclosure = requiredString(configIn.disclosure, "Disclosure", 400);
  if (!disclosure.ok) return disclosure;

  const steps = asRecord(configIn.steps);
  if (!steps) return { ok: false, error: "Step copy is required." };
  for (const key of ["categories", "details", "review", "next"] as const) {
    const step = asRecord(steps[key]);
    if (!step) return { ok: false, error: `Step “${key}” copy is required.` };
    const heading = requiredString(step.heading, `${key} heading`, 80);
    if (!heading.ok) return heading;
    const helper = requiredString(step.helper, `${key} helper`, 240);
    if (!helper.ok) return helper;
  }

  if (typeof configIn.flexibleDates !== "boolean") {
    return { ok: false, error: "Flexible dates flag must be true or false." };
  }
  if (typeof configIn.extras !== "boolean") {
    return { ok: false, error: "Extras flag must be true or false." };
  }

  const chips = asRecord(configIn.chips);
  if (!chips) return { ok: false, error: "Chip labels are required." };
  for (const key of ["flights", "hotel", "car", "unsure"] as const) {
    const chip = requiredString(chips[key], `${key} chip`, 80);
    if (!chip.ok) return chip;
  }

  const config = normalizeConfig(configIn);

  const partnerList = body.partners;
  if (!Array.isArray(partnerList)) {
    return { ok: false, error: "Partners must be a list." };
  }

  const partners: TripPlannerPartner[] = [];
  const seen = new Set<string>();
  for (const item of partnerList) {
    const record = asRecord(item);
    if (!record) return { ok: false, error: "Each partner must be an object." };
    const keyCheck = requiredString(record.key, "Partner key", 40);
    if (!keyCheck.ok) return keyCheck;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(keyCheck.value)) {
      return {
        ok: false,
        error: `Partner key “${keyCheck.value}” must be kebab-case.`,
      };
    }
    if (seen.has(keyCheck.value)) {
      return { ok: false, error: `Duplicate partner key “${keyCheck.value}”.` };
    }
    seen.add(keyCheck.value);

    if (
      typeof record.showWhen !== "string" ||
      !(PARTNER_SHOW_WHEN as readonly string[]).includes(record.showWhen)
    ) {
      return {
        ok: false,
        error: `Partner “${keyCheck.value}” needs a show-when value.`,
      };
    }

    const label = requiredString(record.label, `${keyCheck.value} label`, 80);
    if (!label.ok) return label;
    const button = requiredString(
      record.buttonLabel,
      `${keyCheck.value} button`,
      40,
    );
    if (!button.ok) return button;
    const blurb = requiredString(record.blurb, `${keyCheck.value} blurb`, 200);
    if (!blurb.ok) return blurb;

    const template =
      typeof record.affiliateUrlTemplate === "string"
        ? record.affiliateUrlTemplate.trim()
        : "";
    const fallback =
      typeof record.affiliateUrl === "string" ? record.affiliateUrl.trim() : "";
    if (!template || !isTemplateUrl(template)) {
      return {
        ok: false,
        error: `Partner “${keyCheck.value}” needs an http(s) affiliate URL template.`,
      };
    }
    if (!fallback || !isHttpUrl(fallback)) {
      return {
        ok: false,
        error: `Partner “${keyCheck.value}” needs an http(s) fallback affiliate URL.`,
      };
    }

    const partner = normalizePartner({
      ...record,
      key: keyCheck.value,
      label: label.value,
      buttonLabel: button.value,
      blurb: blurb.value,
      affiliateUrlTemplate: template,
      affiliateUrl: fallback,
      enabled: record.enabled === true,
      isCore: record.isCore === true,
    });
    if (!partner) {
      return { ok: false, error: `Partner “${keyCheck.value}” is invalid.` };
    }
    partners.push(partner);
  }

  return { ok: true, config, partners };
}
