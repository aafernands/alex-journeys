import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_CONFIG,
  DEFAULT_PARTNERS,
  normalizeConfig,
  normalizePartners,
  type TripPlannerConfig,
  type TripPlannerPartner,
} from "@/lib/trip-planner-model";

const DIR = path.join(process.cwd(), "src/content/trip-planner");

function readJson(name: string): unknown {
  const file = path.join(DIR, name);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export function getTripPlannerConfig(): TripPlannerConfig {
  const raw = readJson("config.json");
  if (!raw) return DEFAULT_CONFIG;
  return normalizeConfig(raw);
}

export function getTripPlannerPartners(): TripPlannerPartner[] {
  const raw = readJson("partners.json");
  if (!raw) return DEFAULT_PARTNERS;
  return normalizePartners(raw) ?? DEFAULT_PARTNERS;
}
