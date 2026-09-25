/**
 * Packing checklist stored in the trip’s existing `packingNotes` string.
 * Older plain-text and checkbox notes still read. New edits save @@ajpack1 JSON
 * so quantities, categories, and checked state survive this browser and an account.
 */
export const PACKING_NOTES_LIMIT = 16_000;
const PREFIX = "@@ajpack1";
const MAX_ITEMS = 120;
const MAX_DISMISSED = 80;

export const PACKING_CATEGORIES = [
  { id: "clothes", label: "Clothes" },
  { id: "toiletries", label: "Toiletries" },
  { id: "tech", label: "Tech" },
  { id: "documents", label: "Documents" },
  { id: "health", label: "Health" },
  { id: "kids", label: "Kids" },
  { id: "gear", label: "Gear" },
  { id: "other", label: "Other" },
] as const;

export type PackingCategoryId = (typeof PACKING_CATEGORIES)[number]["id"];

export type PackingItem = {
  id: string;
  category: string;
  label: string;
  quantity: number;
  packed: boolean;
  /** "" is shared. "a1"…"a8" are adults. "kids" is the children on the trip. */
  who: string;
};

export type PackingListState = {
  items: PackingItem[];
  dismissed: string[];
  /** True when a structured note is saved but cannot be parsed. The raw string is kept. */
  unreadable: boolean;
};

export type LegacyPackingItem = { label: string; checked: boolean };
export type LegacyPackingGroup = { title: string; items: LegacyPackingItem[] };

export type PackingTripContext = {
  nights: number;
  destination: string;
  /** Planner picks: flights, hotel, car. */
  categories: readonly string[];
  /** Booking types already on the itinerary. */
  itemTypes: readonly string[];
  adults: number;
  children: number;
};

export type PackingTemplateId =
  | "essentials"
  | "beach"
  | "city"
  | "cold"
  | "hiking"
  | "business"
  | "carry-on"
  | "kids";

export type PackingSuggestion = {
  id: string;
  category: string;
  label: string;
  quantity: number;
  reason: string;
  who: string;
};

const CHECKED_ITEM =
  /^(?:[-*•]\s+)?(?:\[[xX]\]|\([xX]\)|[✓✔☑])\s*(.*)$/;
const UNCHECKED_ITEM =
  /^(?:[-*•]\s+)?(?:\[\s?\]|\(\s?\)|[☐])\s*(.*)$/;
const BULLET_ITEM = /^[-*•]\s+(.*)$/;
const MARKDOWN_HEADING = /^#{1,3}\s+(.*)$/;

const KNOWN_HEADINGS: Record<string, PackingCategoryId> = {
  clothes: "clothes",
  clothing: "clothes",
  outfits: "clothes",
  toiletries: "toiletries",
  bathroom: "toiletries",
  tech: "tech",
  electronics: "tech",
  gadgets: "tech",
  documents: "documents",
  document: "documents",
  docs: "documents",
  paperwork: "documents",
  health: "health",
  medicine: "health",
  medical: "health",
  kids: "kids",
  children: "kids",
  child: "kids",
  baby: "kids",
  gear: "gear",
  outdoor: "gear",
  other: "other",
  misc: "other",
  miscellaneous: "other",
  topack: "other",
};

const INFER_RULES: { pattern: RegExp; category: PackingCategoryId }[] = [
  { pattern: /\b(hiking shoes|hiking boots)\b/i, category: "gear" },
  { pattern: /\b(passport|visa|boarding|insurance card|confirmation)\b/i, category: "documents" },
  { pattern: /\b(driver'?s license|driving licence|photo id)\b/i, category: "documents" },
  { pattern: /\b(toothbrush|toothpaste|deodorant|shampoo|sunscreen|razor|soap|floss)\b/i, category: "toiletries" },
  { pattern: /\b(chargers?|adapters?|laptops?|headphones?|earbuds|power banks?|cables?|cameras?|phones?|kindles?|tablets?|e-readers?)\b/i, category: "tech" },
  { pattern: /\b(medicine|medication|first[- ]aid|prescription|bandage|vitamin)\b/i, category: "health" },
  { pattern: /\b(kids|baby|wipes|diaper|pacifier)\b/i, category: "kids" },
  { pattern: /\b(daypack|backpack|water bottle|packing cubes?|umbrella|towel|neck pillow)\b/i, category: "gear" },
  { pattern: /\b(underwear|socks?|shirts?|t-?shirts?|pants|shorts|dress|jacket|coat|shoes?|sweater|jeans|pajama|swimsuit|swimwear|hat|gloves|beanie|sandals?|outfit|bra)\b/i, category: "clothes" },
];

type TemplateLine = {
  category: string;
  label: string;
  quantity: number | ((ctx: PackingTripContext) => number);
  who?: string | ((ctx: PackingTripContext) => string);
};

export const PACKING_TEMPLATES: {
  id: PackingTemplateId;
  label: string;
  detail: string;
  lines: TemplateLine[];
}[] = [
  {
    id: "essentials",
    label: "Essentials",
    detail: "Sized to this trip",
    lines: [
      { category: "clothes", label: "Underwear", quantity: (ctx) => perNight(ctx.nights) },
      { category: "clothes", label: "Socks", quantity: (ctx) => perNight(ctx.nights) },
      { category: "clothes", label: "T-shirts", quantity: (ctx) => Math.min(perNight(ctx.nights), 7) },
      { category: "clothes", label: "Bottoms", quantity: (ctx) => bottoms(ctx.nights) },
      { category: "clothes", label: "Sleepwear", quantity: 1 },
      { category: "clothes", label: "Comfortable shoes", quantity: 1 },
      { category: "toiletries", label: "Toothbrush", quantity: 1 },
      { category: "toiletries", label: "Toothpaste", quantity: 1 },
      { category: "toiletries", label: "Deodorant", quantity: 1 },
      { category: "health", label: "Daily medication", quantity: 1 },
      { category: "tech", label: "Phone", quantity: 1 },
      { category: "tech", label: "Phone charger", quantity: 1 },
      { category: "documents", label: "Photo ID", quantity: 1 },
    ],
  },
  {
    id: "beach",
    label: "Beach",
    detail: "Sun, swim, and sand",
    lines: [
      { category: "clothes", label: "Swimsuit", quantity: 1 },
      { category: "clothes", label: "Cover-up", quantity: 1 },
      { category: "clothes", label: "Sandals", quantity: 1 },
      { category: "clothes", label: "Sun hat", quantity: 1 },
      { category: "toiletries", label: "Sunscreen", quantity: 1 },
      { category: "gear", label: "Sunglasses", quantity: 1 },
      { category: "gear", label: "Beach bag", quantity: 1 },
    ],
  },
  {
    id: "city",
    label: "City",
    detail: "Days on foot",
    lines: [
      { category: "clothes", label: "Walking shoes", quantity: 1 },
      { category: "clothes", label: "Light jacket", quantity: 1 },
      { category: "clothes", label: "Comfortable outfit", quantity: 1 },
      { category: "gear", label: "Day bag", quantity: 1 },
      { category: "tech", label: "Portable charger", quantity: 1 },
    ],
  },
  {
    id: "cold",
    label: "Cold weather",
    detail: "Layers and warmth",
    lines: [
      { category: "clothes", label: "Warm coat", quantity: 1 },
      { category: "clothes", label: "Sweater", quantity: 1 },
      { category: "clothes", label: "Thermal layer", quantity: 1 },
      { category: "clothes", label: "Gloves", quantity: 1 },
      { category: "clothes", label: "Beanie", quantity: 1 },
      { category: "clothes", label: "Warm socks", quantity: (ctx) => perNight(ctx.nights) },
      { category: "toiletries", label: "Lip balm", quantity: 1 },
    ],
  },
  {
    id: "hiking",
    label: "Hiking",
    detail: "Trail days",
    lines: [
      { category: "gear", label: "Hiking shoes", quantity: 1 },
      { category: "gear", label: "Daypack", quantity: 1 },
      { category: "gear", label: "Water bottle", quantity: 1 },
      { category: "clothes", label: "Rain jacket", quantity: 1 },
      { category: "health", label: "First-aid kit", quantity: 1 },
      { category: "gear", label: "Trail snacks", quantity: 1 },
      { category: "toiletries", label: "Sunscreen", quantity: 1 },
    ],
  },
  {
    id: "business",
    label: "Business",
    detail: "Meetings and a laptop",
    lines: [
      { category: "clothes", label: "Nice outfit", quantity: 1 },
      { category: "clothes", label: "Dress shoes", quantity: 1 },
      { category: "tech", label: "Laptop", quantity: 1 },
      { category: "tech", label: "Laptop charger", quantity: 1 },
      { category: "other", label: "Notebook", quantity: 1 },
    ],
  },
  {
    id: "carry-on",
    label: "Flying carry-on",
    detail: "One bag, nothing checked",
    lines: [
      { category: "gear", label: "Packing cubes", quantity: 1 },
      { category: "toiletries", label: "Liquids bag", quantity: 1 },
      { category: "gear", label: "Neck pillow", quantity: 1 },
      { category: "documents", label: "Downloaded boarding pass", quantity: 1 },
      { category: "clothes", label: "Outfit worn on the plane", quantity: 1 },
      { category: "toiletries", label: "Travel-size toiletries", quantity: 1 },
    ],
  },
  {
    id: "kids",
    label: "With kids",
    detail: "For the little travelers",
    lines: [
      { category: "kids", label: "Kids outfits", quantity: (ctx) => perNight(ctx.nights), who: "kids" },
      { category: "kids", label: "Kids pajamas", quantity: 1, who: "kids" },
      { category: "kids", label: "Wipes", quantity: 1, who: "kids" },
      { category: "kids", label: "Snacks", quantity: 1, who: "kids" },
      { category: "kids", label: "Comfort item", quantity: 1, who: "kids" },
      { category: "health", label: "Kids medication", quantity: 1, who: "kids" },
      { category: "kids", label: "Entertainment for the journey", quantity: 1, who: "kids" },
    ],
  },
];

function perNight(nights: number): number {
  if (!Number.isFinite(nights) || nights < 1) return 3;
  return Math.min(Math.trunc(nights), 21);
}

function bottoms(nights: number): number {
  return Math.min(4, Math.max(1, Math.ceil(perNight(nights) / 3)));
}

export function categoryLabel(id: string): string {
  return PACKING_CATEGORIES.find((category) => category.id === id)?.label ?? id;
}

export function isKnownCategory(id: string): id is PackingCategoryId {
  return PACKING_CATEGORIES.some((category) => category.id === id);
}

function headingKey(title: string): string {
  return title.toLowerCase().replace(/[^a-z]/g, "");
}

function categoryFromHeading(title: string): string {
  const known = KNOWN_HEADINGS[headingKey(title)];
  if (known) return known;
  const custom = title.replace(/\s+/g, " ").trim().slice(0, 40);
  return custom || "other";
}

export function inferPackingCategory(label: string): string {
  for (const rule of INFER_RULES) {
    if (rule.pattern.test(label)) return rule.category;
  }
  return "other";
}

export function normalizePackingLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sameLabel(left: string, right: string): boolean {
  const a = normalizePackingLabel(left);
  const b = normalizePackingLabel(right);
  if (!a || !b) return false;
  return a === b || a + "s" === b || b + "s" === a;
}

export function hasPackingLabel(items: readonly PackingItem[], label: string): boolean {
  return items.some((item) => sameLabel(item.label, label));
}

function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(99, Math.max(1, Math.trunc(value)));
}

/** Pull a leading or trailing count off a typed or migrated line. */
export function splitPackingQuantity(raw: string): { label: string; quantity: number } | null {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const leading = text.match(/^(\d{1,2})\s*(?:x|×)\s+(.+)$/i);
  if (leading?.[2]) {
    return { quantity: clampQuantity(Number(leading[1])), label: cleanLabel(leading[2]) };
  }
  const words = text.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ].+)$/);
  if (words?.[2] && Number(words[1]) > 1) {
    return { quantity: clampQuantity(Number(words[1])), label: cleanLabel(words[2]) };
  }
  const trailing = text.match(/^(.+?[A-Za-zÀ-ÿ].+?)\s*(?:x|×)\s*(\d{1,2})$/i);
  if (trailing?.[1]) {
    return { quantity: clampQuantity(Number(trailing[2])), label: cleanLabel(trailing[1]) };
  }
  const paren = text.match(/^(.+?[A-Za-zÀ-ÿ].+?)\s*\((\d{1,2})\)$/);
  if (paren?.[1]) {
    return { quantity: clampQuantity(Number(paren[2])), label: cleanLabel(paren[1]) };
  }
  const label = cleanLabel(text);
  if (!label) return null;
  return { label, quantity: 1 };
}

function cleanLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
}

function itemMarker(line: string): { checked: boolean; label: string } | null {
  const checked = line.match(CHECKED_ITEM);
  if (checked) return { checked: true, label: (checked[1] ?? "").trim() };
  const open = line.match(UNCHECKED_ITEM);
  if (open) return { checked: false, label: (open[1] ?? "").trim() };
  const bullet = line.match(BULLET_ITEM);
  if (bullet) return { checked: false, label: (bullet[1] ?? "").trim() };
  return null;
}

function isMarkedItem(line: string): boolean {
  return itemMarker(line) !== null;
}

/** Categories from a heading line, then checklist items. Plain lines stay one group. */
export function parsePackingList(notes: string): LegacyPackingGroup[] {
  const lines = notes.replace(/\r\n/g, "\n").split("\n");
  const groups: LegacyPackingGroup[] = [];
  let current: LegacyPackingGroup | null = null;

  function openGroup(title: string) {
    const name = title.replace(/:\s*$/, "").replace(/\s+/g, " ").trim() || "To pack";
    current = { title: name.slice(0, 80), items: [] };
    groups.push(current);
    return current;
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = (lines[index] ?? "").trim();
    if (!line) continue;

    const markdown = line.match(MARKDOWN_HEADING);
    if (markdown?.[1]?.trim()) {
      openGroup(markdown[1]);
      continue;
    }

    const next =
      lines
        .slice(index + 1)
        .map((entry) => entry.trim())
        .find(Boolean) ?? "";
    const colonHeading =
      /:\s*$/.test(line) && line.length <= 60 && !isMarkedItem(line);
    const checklistHeading =
      !isMarkedItem(line) &&
      isMarkedItem(next) &&
      line.length <= 48 &&
      !/[.!?]$/.test(line);

    if (colonHeading || checklistHeading) {
      openGroup(line);
      continue;
    }

    const parsed = itemMarker(line);
    const label = (parsed?.label ?? line).replace(/\s+/g, " ").trim();
    if (!label) continue;
    const group = current ?? openGroup("To pack");
    group.items.push({
      label: label.slice(0, 200),
      checked: parsed?.checked ?? false,
    });
  }

  return groups.filter((group) => group.items.length > 0);
}

function legacyId(category: string, label: string, index: number): string {
  const slug = normalizePackingLabel(label).replace(/\s+/g, "-").slice(0, 24) || "item";
  return `legacy-${index}-${slug}`.slice(0, 40);
}

function fromLegacy(notes: string): Pick<PackingListState, "items" | "dismissed"> {
  const groups = parsePackingList(notes);
  const items: PackingItem[] = [];
  let index = 0;
  for (const group of groups) {
    const explicit = group.title !== "To pack";
    for (const entry of group.items) {
      const split = splitPackingQuantity(entry.label) ?? {
        label: entry.label.slice(0, 80),
        quantity: 1,
      };
      const category = explicit
        ? categoryFromHeading(group.title)
        : inferPackingCategory(split.label);
      items.push({
        id: legacyId(category, split.label, index),
        category,
        label: split.label,
        quantity: split.quantity,
        packed: entry.checked,
        who: "",
      });
      index += 1;
      if (items.length >= MAX_ITEMS) break;
    }
  }
  return { items, dismissed: [] };
}

function cleanWho(value: unknown): string {
  if (typeof value !== "string") return "";
  const who = value.trim();
  if (who === "kids") return "kids";
  if (/^a[1-8]$/.test(who)) return who;
  return "";
}

function normalizeStored(value: unknown): Pick<PackingListState, "items" | "dismissed"> {
  const record = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items: PackingItem[] = [];
  const seen = new Set<string>();
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const label = typeof row.label === "string" ? cleanLabel(row.label) : "";
    if (!label) continue;
    let id = typeof row.id === "string" ? row.id.trim().slice(0, 40) : "";
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id) || seen.has(id)) {
      id = legacyId(String(row.category ?? "other"), label, items.length);
    }
    seen.add(id);
    const categoryRaw = typeof row.category === "string" ? row.category.trim().slice(0, 40) : "";
    const category = categoryRaw || inferPackingCategory(label);
    const quantity = clampQuantity(
      typeof row.quantity === "number" ? row.quantity : Number(row.quantity ?? 1),
    );
    items.push({
      id,
      category,
      label,
      quantity,
      packed: row.packed === true,
      who: cleanWho(row.who),
    });
    if (items.length >= MAX_ITEMS) break;
  }
  const dismissed = Array.isArray(record.dismissed)
    ? record.dismissed
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim().slice(0, 80))
        .filter(Boolean)
        .slice(0, MAX_DISMISSED)
    : [];
  return { items, dismissed: [...new Set(dismissed)] };
}

export function isStructuredPackingNotes(notes: string): boolean {
  return notes.trimStart().startsWith(PREFIX);
}

export function readPackingList(notes: string): PackingListState {
  const trimmed = notes.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return { items: [], dismissed: [], unreadable: false };
  if (!trimmed.startsWith(PREFIX)) {
    return { ...fromLegacy(trimmed), unreadable: false };
  }
  const json = trimmed.slice(PREFIX.length).trim();
  try {
    return { ...normalizeStored(JSON.parse(json) as unknown), unreadable: false };
  } catch {
    return { items: [], dismissed: [], unreadable: true };
  }
}

export function writePackingList(state: PackingListState): string {
  const items = state.items.slice(0, MAX_ITEMS).map((item) => {
    const row: Record<string, unknown> = {
      id: item.id,
      category: item.category,
      label: item.label,
    };
    if (item.quantity > 1) row.quantity = item.quantity;
    if (item.packed) row.packed = true;
    if (item.who) row.who = item.who;
    return row;
  });
  const dismissed = [...new Set(state.dismissed)].slice(0, MAX_DISMISSED);
  let kept = items;
  let keepDismissed = dismissed;
  let text = "";
  do {
    const payload: Record<string, unknown> = { v: 1, items: kept };
    if (keepDismissed.length > 0) payload.dismissed = keepDismissed;
    text = `${PREFIX}\n${JSON.stringify(payload)}`;
    if (text.length <= PACKING_NOTES_LIMIT) break;
    if (keepDismissed.length > 0) {
      keepDismissed = [];
      continue;
    }
    kept = kept.slice(0, -1);
  } while (kept.length > 0);
  return text.slice(0, PACKING_NOTES_LIMIT);
}

let idCounter = 0;

export function createPackingId(): string {
  idCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8);
  return `p${idCounter.toString(36)}${rand}`.slice(0, 16);
}

export function packingProgress(items: readonly PackingItem[]): { packed: number; total: number } {
  return {
    packed: items.filter((item) => item.packed).length,
    total: items.length,
  };
}

export type PackingGroupView = {
  id: string;
  label: string;
  items: PackingItem[];
};

export function groupPackingItems(items: readonly PackingItem[]): PackingGroupView[] {
  const buckets = new Map<string, PackingItem[]>();
  for (const item of items) {
    const id = item.category || "other";
    const list = buckets.get(id) ?? [];
    list.push(item);
    buckets.set(id, list);
  }
  const ordered: string[] = [];
  for (const category of PACKING_CATEGORIES) {
    if (buckets.has(category.id)) ordered.push(category.id);
  }
  for (const id of buckets.keys()) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered.map((id) => ({
    id,
    label: categoryLabel(id),
    items: buckets.get(id) ?? [],
  }));
}

export function packingPdfLabel(item: Pick<PackingItem, "label" | "quantity" | "who">): string {
  const qty = item.quantity > 1 ? `${item.label} × ${item.quantity}` : item.label;
  const who = packingWhoLabel(item.who, 2);
  return who && item.who ? `${qty} (${who})` : qty;
}

export function packingPdfGroups(notes: string): LegacyPackingGroup[] {
  const list = readPackingList(notes);
  if (list.unreadable) return parsePackingList(notes.replace(PREFIX, ""));
  return groupPackingItems(list.items).map((group) => ({
    title: group.label,
    items: group.items.map((item) => ({
      label: packingPdfLabel(item),
      checked: item.packed,
    })),
  }));
}

export function packingWhoLabel(who: string, adults: number): string {
  if (!who) return "Everyone";
  if (who === "kids") return "Kids";
  const adult = /^a(\d+)$/.exec(who);
  if (!adult) return "Everyone";
  if (adults <= 1 && adult[1] === "1") return "You";
  return `Adult ${adult[1]}`;
}

export function packingTravelers(
  adults: number,
  children: number,
): { id: string; label: string }[] {
  const count = Math.max(1, Math.min(8, Math.trunc(adults) || 1));
  const kids = Math.max(0, Math.trunc(children) || 0);
  const choices = [{ id: "", label: "Everyone" }];
  if (count + kids > 1) {
    for (let index = 1; index <= count; index += 1) {
      choices.push({
        id: `a${index}`,
        label: count === 1 ? "You" : `Adult ${index}`,
      });
    }
  }
  if (kids > 0) choices.push({ id: "kids", label: kids === 1 ? "Child" : "Kids" });
  return choices;
}

export function showTravelerControls(adults: number, children: number): boolean {
  return Math.max(0, adults) + Math.max(0, children) > 1;
}

function withItems(state: PackingListState, items: PackingItem[]): PackingListState {
  return { ...state, items, unreadable: false };
}

export function togglePacked(state: PackingListState, id: string): PackingListState {
  return withItems(
    state,
    state.items.map((item) => (item.id === id ? { ...item, packed: !item.packed } : item)),
  );
}

export function updatePackingItem(
  state: PackingListState,
  id: string,
  patch: Partial<Pick<PackingItem, "label" | "quantity" | "category" | "who" | "packed">>,
): PackingListState {
  return withItems(
    state,
    state.items.map((item) => {
      if (item.id !== id) return item;
      const label = patch.label !== undefined ? cleanLabel(patch.label) : item.label;
      return {
        ...item,
        label: label || item.label,
        quantity: patch.quantity !== undefined ? clampQuantity(patch.quantity) : item.quantity,
        category: patch.category !== undefined ? patch.category.slice(0, 40) || item.category : item.category,
        who: patch.who !== undefined ? cleanWho(patch.who) : item.who,
        packed: patch.packed !== undefined ? patch.packed : item.packed,
      };
    }),
  );
}

export function deletePackingItem(state: PackingListState, id: string): PackingListState {
  return withItems(
    state,
    state.items.filter((item) => item.id !== id),
  );
}

export function shiftPackingItem(
  state: PackingListState,
  id: string,
  direction: -1 | 1,
): PackingListState {
  const index = state.items.findIndex((item) => item.id === id);
  const item = state.items[index];
  if (!item) return state;
  const siblings = state.items
    .map((entry, entryIndex) => ({ entry, entryIndex }))
    .filter(({ entry }) => entry.category === item.category);
  const pos = siblings.findIndex(({ entryIndex }) => entryIndex === index);
  const neighbor = siblings[pos + direction];
  if (!neighbor) return state;
  const items = state.items.slice();
  items[index] = items[neighbor.entryIndex]!;
  items[neighbor.entryIndex] = item;
  return withItems(state, items);
}

export function uncheckAllPacking(state: PackingListState): PackingListState {
  return withItems(
    state,
    state.items.map((item) => ({ ...item, packed: false })),
  );
}

function lineQuantity(line: TemplateLine, ctx: PackingTripContext): number {
  return clampQuantity(typeof line.quantity === "function" ? line.quantity(ctx) : line.quantity);
}

function lineWho(line: TemplateLine, ctx: PackingTripContext): string {
  const who = typeof line.who === "function" ? line.who(ctx) : line.who ?? "";
  return cleanWho(who);
}

export function addPackingTemplate(
  state: PackingListState,
  templateId: PackingTemplateId,
  ctx: PackingTripContext,
): PackingListState {
  const template = PACKING_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) return state;
  const items = state.items.slice();
  for (const line of template.lines) {
    if (hasPackingLabel(items, line.label)) continue;
    items.push({
      id: createPackingId(),
      category: line.category,
      label: line.label,
      quantity: lineQuantity(line, ctx),
      packed: false,
      who: lineWho(line, ctx),
    });
  }
  return withItems(state, items.slice(0, MAX_ITEMS));
}

export function addQuickPackingItem(
  state: PackingListState,
  raw: string,
  who = "",
): PackingListState {
  const parsed = splitPackingQuantity(raw);
  if (!parsed) return state;
  const items = state.items.concat({
    id: createPackingId(),
    category: inferPackingCategory(parsed.label),
    label: parsed.label,
    quantity: parsed.quantity,
    packed: false,
    who: cleanWho(who),
  });
  return withItems(state, items.slice(0, MAX_ITEMS));
}

function destinationFold(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

const BEACH_WORDS =
  /\b(beach|cancun|caribbean|hawaii|maui|bali|maldives|cabo|tulum|phuket|miami|copacabana|ibiza|santorini|bahamas|aruba|jamaica)\b/;
const COLD_WORDS =
  /\b(iceland|reykjavik|norway|oslo|alaska|greenland|nuuk|finland|helsinki|sweden|stockholm|ski|alps|patagonia|antarctica|quebec|innsbruck|lapland)\b/;
const HIKE_WORDS =
  /\b(hike|hiking|trail|yosemite|banff|dolomites|torres)\b/;

function wants(ctx: PackingTripContext, category: string, itemType: string): boolean {
  return ctx.categories.includes(category) || ctx.itemTypes.includes(itemType);
}

function destinationName(destination: string): string {
  const name = destination.split(",")[0]?.trim() || "this trip";
  return name.length > 32 ? `${name.slice(0, 32).trim()}…` : name;
}

export function packingSuggestions(
  state: PackingListState,
  ctx: PackingTripContext,
): PackingSuggestion[] {
  const place = destinationFold(ctx.destination);
  const beach = BEACH_WORDS.test(place);
  const cold = COLD_WORDS.test(place);
  const hike = HIKE_WORDS.test(place) || /\bpatagonia\b/.test(place);
  const nights = Math.max(0, Math.trunc(ctx.nights) || 0);
  const nightLabel = nights === 1 ? "1 night" : `${nights} nights`;
  const placeLabel = destinationName(ctx.destination);
  const ideas: PackingSuggestion[] = [];

  if (wants(ctx, "flights", "flight")) {
    ideas.push(
      {
        id: "flight-passport",
        category: "documents",
        label: "Passport",
        quantity: 1,
        reason: "You have a flight on this trip",
        who: "",
      },
      {
        id: "flight-boarding",
        category: "documents",
        label: "Boarding pass",
        quantity: 1,
        reason: "You have a flight on this trip",
        who: "",
      },
    );
  }
  if (wants(ctx, "car", "car")) {
    ideas.push({
      id: "car-license",
      category: "documents",
      label: "Driver's license",
      quantity: 1,
      reason: "You have a car rental",
      who: "",
    });
  }
  if (wants(ctx, "hotel", "hotel")) {
    ideas.push({
      id: "hotel-confirmation",
      category: "documents",
      label: "Stay confirmation",
      quantity: 1,
      reason: "You have a stay",
      who: "",
    });
  }
  if (beach && !cold) {
    ideas.push(
      {
        id: "dest-swimsuit",
        category: "clothes",
        label: "Swimsuit",
        quantity: 1,
        reason: `For ${placeLabel}`,
        who: "",
      },
      {
        id: "dest-sunscreen",
        category: "toiletries",
        label: "Sunscreen",
        quantity: 1,
        reason: `For ${placeLabel}`,
        who: "",
      },
    );
  } else if (cold && !beach) {
    ideas.push(
      {
        id: "dest-coat",
        category: "clothes",
        label: "Warm coat",
        quantity: 1,
        reason: `For ${placeLabel}`,
        who: "",
      },
      {
        id: "dest-layers",
        category: "clothes",
        label: "Warm layers",
        quantity: 1,
        reason: `For ${placeLabel}`,
        who: "",
      },
    );
  }
  if (hike) {
    ideas.push({
      id: "dest-hiking-shoes",
      category: "gear",
      label: "Hiking shoes",
      quantity: 1,
      reason: `For ${placeLabel}`,
      who: "",
    });
  }
  if (nights > 0) {
    ideas.push(
      {
        id: "nights-underwear",
        category: "clothes",
        label: "Underwear",
        quantity: perNight(nights),
        reason: `One per night · ${nightLabel}`,
        who: "",
      },
      {
        id: "nights-socks",
        category: "clothes",
        label: "Socks",
        quantity: perNight(nights),
        reason: `One per night · ${nightLabel}`,
        who: "",
      },
    );
  }
  if (ctx.children > 0) {
    ideas.push({
      id: "kids-outfits",
      category: "kids",
      label: "Kids outfits",
      quantity: perNight(nights),
      reason: ctx.children === 1 ? "This trip includes a child" : "This trip includes kids",
      who: "kids",
    });
  }

  return ideas
    .filter((idea) => !state.dismissed.includes(idea.id))
    .filter((idea) => !hasPackingLabel(state.items, idea.label))
    .slice(0, 5);
}

export function acceptPackingSuggestion(
  state: PackingListState,
  suggestion: PackingSuggestion,
): PackingListState {
  if (hasPackingLabel(state.items, suggestion.label)) {
    return {
      ...state,
      dismissed: state.dismissed.filter((id) => id !== suggestion.id),
      unreadable: false,
    };
  }
  return withItems(state, [
    ...state.items,
    {
      id: createPackingId(),
      category: suggestion.category,
      label: suggestion.label,
      quantity: clampQuantity(suggestion.quantity),
      packed: false,
      who: cleanWho(suggestion.who),
    },
  ].slice(0, MAX_ITEMS));
}

export function dismissPackingSuggestion(
  state: PackingListState,
  suggestionId: string,
): PackingListState {
  if (state.dismissed.includes(suggestionId)) return state;
  return {
    ...state,
    dismissed: [...state.dismissed, suggestionId].slice(0, MAX_DISMISSED),
    unreadable: false,
  };
}

export function templateItemCount(templateId: PackingTemplateId): number {
  return PACKING_TEMPLATES.find((entry) => entry.id === templateId)?.lines.length ?? 0;
}

export function tripNightsForPacking(
  dayCount: number,
  flexibleNights: number,
  dateMode: string,
): number {
  if (dayCount >= 2) return dayCount - 1;
  if (dateMode === "flexible") {
    return Math.max(0, Math.min(90, Math.trunc(flexibleNights) || 0));
  }
  return 0;
}
