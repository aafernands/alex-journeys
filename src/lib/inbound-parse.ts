/**
 * Best-effort reading of a forwarded confirmation.
 * Heuristics only — never treated as a complete parse, and never written
 * onto an itinerary until the reader accepts the suggestion.
 * Safe to import from client components.
 */
import {
  createTripItem,
  extractBookingPaste,
  isSafeHttpUrl,
  mentionedTripDay,
  type TripDay,
  type TripItem,
  type TripItemType,
} from "@/lib/trip-record";

export const INBOUND_IMPORT_TYPES = ["flight", "hotel", "car", "activity", "other"] as const;
export type InboundImportType = (typeof INBOUND_IMPORT_TYPES)[number];

export type ParsedImport = {
  type: InboundImportType;
  title: string;
  confirmation: string;
  startDate: string;
  endDate: string;
  time: string;
  url: string;
};

export type InboundSuggestion = ParsedImport & {
  id: string;
  messageId: string;
  source: "email";
  /** Truncated subject so the reader can recognize the mail. Not the body. */
  subject: string;
  createdAt: string;
};

export type InboundMailboxView = {
  address: string;
  enabled: boolean;
  scope: "account" | "trip";
  suggestions: InboundSuggestion[];
};

const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const AIRLINE_CODES = new Set([
  "UA", "AA", "DL", "B6", "WN", "LH", "BA", "AC", "TP", "KL",
  "AF", "IB", "FR", "U2", "EK", "QR", "TK", "NH", "JL", "AS",
  "NK", "F9", "HA", "VS", "SK", "AY", "LX", "OS", "SN", "AZ",
  "LA", "AM", "CM", "EI",
]);

const AIRLINES: Array<[RegExp, string]> = [
  [/\bunited\b/i, "United"],
  [/\bdelta\b/i, "Delta"],
  [/\bamerican airlines\b/i, "American"],
  [/\bjetblue\b/i, "JetBlue"],
  [/\bsouthwest\b/i, "Southwest"],
  [/\blufthansa\b/i, "Lufthansa"],
  [/\bbritish airways\b/i, "British Airways"],
  [/\bair canada\b/i, "Air Canada"],
  [/\btap air\b/i, "TAP"],
  [/\bklm\b/i, "KLM"],
  [/\bair france\b/i, "Air France"],
];

const CAR_BRANDS: Array<[RegExp, string]> = [
  [/\bhertz\b/i, "Hertz"],
  [/\bavis\b/i, "Avis"],
  [/\benterprise\b/i, "Enterprise"],
  [/\bsixt\b/i, "Sixt"],
  [/\balamo\b/i, "Alamo"],
  [/\bbudget\b/i, "Budget"],
];

type Dated = { iso: string; index: number };

function isoFromParts(year: number, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function collectDates(text: string): Dated[] {
  const found: Dated[] = [];
  const push = (index: number, year: number, month: number, day: number) => {
    const iso = isoFromParts(year, month, day);
    if (!iso) return;
    found.push({ iso, index });
  };

  for (const match of text.matchAll(/\b(20\d{2})-(\d{2})-(\d{2})\b/g)) {
    push(match.index ?? 0, Number(match[1]), Number(match[2]), Number(match[3]));
  }
  for (const match of text.matchAll(
    new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d{2})\\b`, "gi"),
  )) {
    const month = MONTHS[match[1].toLowerCase().replace(".", "")];
    if (!month) continue;
    push(match.index ?? 0, Number(match[3]), month, Number(match[2]));
  }
  for (const match of text.matchAll(
    new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH})\\.?,?\\s+(20\\d{2})\\b`, "gi"),
  )) {
    const month = MONTHS[match[2].toLowerCase().replace(".", "")];
    if (!month) continue;
    push(match.index ?? 0, Number(match[3]), month, Number(match[1]));
  }
  for (const match of text.matchAll(
    /\b(\d{2})(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)(20\d{2})\b/gi,
  )) {
    const month = MONTHS[match[2].toLowerCase()];
    if (!month) continue;
    push(match.index ?? 0, Number(match[3]), month, Number(match[1]));
  }

  found.sort((a, b) => a.index - b.index);
  const unique: Dated[] = [];
  for (const entry of found) {
    if (unique.some((item) => item.iso === entry.iso && Math.abs(item.index - entry.index) < 4)) {
      continue;
    }
    unique.push(entry);
  }
  return unique;
}

function dateAfter(text: string, label: RegExp): string {
  const match = label.exec(text);
  if (!match || match.index == null) return "";
  const window = text.slice(match.index, match.index + 90);
  return collectDates(window)[0]?.iso ?? "";
}

function timeAfter(text: string, label: RegExp): string {
  const match = label.exec(text);
  if (!match || match.index == null) return "";
  return extractBookingPaste(text.slice(match.index, match.index + 70)).time;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => {
      const code = Number(digits);
      return code > 0 && code < 128 ? String.fromCharCode(code) : " ";
    })
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function plainBody(text: string, html: string): string {
  const plain = text.replace(/\r\n/g, "\n").trim();
  if (plain.length >= 40) return plain.slice(0, 50_000);
  const fromHtml = html ? stripHtml(html) : "";
  return [plain, fromHtml].filter(Boolean).join("\n").slice(0, 50_000);
}

function cleanSubject(subject: string): string {
  let value = subject.replace(/^\s*((re|fw|fwd)\s*:\s*)+/i, "").trim();
  value = value.replace(/\s+/g, " ");
  const parts = value.split(/\s+[—–-]\s+/);
  if (parts.length > 1) {
    const tail = parts[parts.length - 1]?.trim() ?? "";
    if (tail.length >= 3 && !/confirm/i.test(tail)) value = tail;
  }
  value = value.replace(/^(your|you're|youre)\s+/i, "");
  value = value.replace(
    /\b(e-?ticket|confirmation|confirmed|reservation|booking|itinerary|number|code)\b/gi,
    " ",
  );
  value = value.replace(/\s+/g, " ").replace(/^[\s,:.#-]+|[\s,:.#-]+$/g, "").trim();
  return value.slice(0, 80);
}

function score(text: string, rules: Array<[RegExp, number]>): number {
  return rules.reduce((total, [pattern, weight]) => {
    pattern.lastIndex = 0;
    return pattern.test(text) ? total + weight : total;
  }, 0);
}

function findFlightNumber(text: string): string {
  for (const match of text.toUpperCase().matchAll(/\b([A-Z]{2})\s*(\d{2,4})\b/g)) {
    const code = match[1];
    const number = String(Number(match[2]));
    if (!code || !AIRLINE_CODES.has(code) || number === "0") continue;
    return `${code} ${number}`;
  }
  return "";
}

function findRoute(text: string): string {
  const match = text
    .toUpperCase()
    .match(/\b([A-Z]{3})\b(?:\s+\([^)]{1,24}\))?\s+TO\s+\b([A-Z]{3})\b/);
  if (!match || match[1] === match[2]) return "";
  return `${match[1]} to ${match[2]}`;
}

const CODE_LABEL =
  /(?:\bconfirmation\b|\bconf\b\.?|\bbooking\s*(?:ref(?:erence)?|code|number|id)\b|\brecord\s*locator\b|\bpnr\b|\breservation\s*(?:code|number|#)?\b)\s*(?:number|code|no\.?|#|:)?\s*(?:is|:|#|-)?\s*([A-Za-z0-9][A-Za-z0-9-]{4,19})/gi;

const CODE_WORDS = new Set([
  "thanks", "thank", "confirmed", "confirmation", "reservation", "booking",
  "number", "itinerary", "please", "hello", "hotel", "flight", "check",
  "united", "with", "your", "code", "hertz", "airbnb",
]);

/** Prefer a token that looks like a record locator, not the next English word. */
function findConfirmation(text: string): string {
  CODE_LABEL.lastIndex = 0;
  for (const match of text.matchAll(CODE_LABEL)) {
    const code = (match[1] ?? "").replace(/[^A-Za-z0-9-]/g, "").slice(0, 40);
    if (code.length < 5 || code.length > 20) continue;
    if (CODE_WORDS.has(code.toLowerCase())) continue;
    if (!/\d/.test(code) && code !== code.toUpperCase()) continue;
    return code;
  }
  return "";
}

function collectUrls(text: string): string[] {
  const urls: string[] = [];
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    const candidate = match[0].replace(/[.,;:!?)]+$/, "");
    if (!isSafeHttpUrl(candidate)) continue;
    if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(candidate)) continue;
    const url = candidate.slice(0, 500);
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

function pickUrl(urls: string[], type: InboundImportType): string {
  const prefs: Partial<Record<InboundImportType, RegExp>> = {
    flight: /united|delta|aa\.com|lufthansa|britishairways|aircanada|jetblue|southwest|airline/i,
    hotel: /airbnb|booking\.com|vrbo|marriott|hilton|hyatt|hotels\.com/i,
    car: /hertz|avis|enterprise|sixt|alamo|national/i,
    activity: /viator|getyourguide/i,
  };
  const preferred = prefs[type];
  if (preferred) {
    const match = urls.find((url) => preferred.test(url));
    if (match) return match;
  }
  return urls[0] ?? "";
}

function flightTitle(text: string, subject: string): string {
  const number = findFlightNumber(text);
  const route = findRoute(text);
  if (number) return route ? `Flight ${number} · ${route}` : `Flight ${number}`;
  const airline = AIRLINES.find(([pattern]) => pattern.test(text))?.[1];
  if (airline) return `${airline} flight`;
  return cleanSubject(subject) || "Flight";
}

function hotelTitle(text: string, subject: string): string {
  const named = text.match(
    /\bat\s+([A-Z][A-Za-z0-9'&.-]+(?:\s+[A-Z][A-Za-z0-9'&.-]+){0,5})/,
  );
  if (named?.[1]) return named[1].slice(0, 80);
  return cleanSubject(subject) || "Stay";
}

function carTitle(text: string, subject: string): string {
  const brand = CAR_BRANDS.find(([pattern]) => pattern.test(text))?.[1];
  if (brand) return `${brand} rental`;
  return cleanSubject(subject) || "Rental car";
}

function activityTitle(subject: string): string {
  return cleanSubject(subject) || "Experience";
}

/**
 * Pull zero or more suggested bookings from a subject and body.
 * HTML is stripped and not returned. An empty result means we found nothing
 * worth suggesting.
 */
export function parseInboundEmail(input: {
  subject?: string;
  text?: string;
  html?: string;
}): ParsedImport[] {
  const subject = (input.subject ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const body = plainBody(input.text ?? "", input.html ?? "");
  const corpus = `${subject}\n${body}`.trim();
  if (!corpus) return [];

  const flightNumber = findFlightNumber(corpus);
  const categories: Array<{ type: InboundImportType; score: number }> = [
    {
      type: "flight",
      score: score(corpus, [
        [/\b(united|delta|american airlines|jetblue|southwest|lufthansa|british airways|air canada|tap air|klm|air france)\b/i, 2],
        [/\bflight\b/i, 1],
        [/\b(boarding pass|record locator|departing|departure)\b/i, 1],
      ]) + (flightNumber ? 2 : 0),
    },
    {
      type: "hotel",
      score: score(corpus, [
        [/\b(airbnb|vrbo|booking\.com|marriott|hilton|hyatt)\b/i, 2],
        [/\bhotel\b/i, 1],
        [/\bcheck-?in\b/i, 1],
        [/\bcheck-?out\b/i, 1],
        [/\b(hostel|nights?)\b/i, 1],
      ]),
    },
    {
      type: "car",
      score: score(corpus, [
        [/\b(hertz|avis|enterprise|sixt|alamo)\b/i, 2],
        [/\b(rental car|car rental|rent a car)\b/i, 2],
        [/\bpick-?up\b/i, 1],
        [/\bdrop-?off\b/i, 1],
      ]),
    },
    {
      type: "activity",
      score: score(corpus, [
        [/\b(viator|getyourguide)\b/i, 2],
        [/\b(tour|experience)\s+confirmed\b/i, 2],
      ]),
    },
  ];

  const ranked = categories.filter((entry) => entry.score >= 2).sort((a, b) => b.score - a.score);
  const leader = ranked[0];
  const chosen = leader
    ? ranked.filter((entry) => leader.score - entry.score < 2).slice(0, 3)
    : [];

  const pasted = extractBookingPaste(corpus);
  const confirmation = findConfirmation(corpus);
  const dates = collectDates(corpus);
  const urls = collectUrls(corpus);

  if (chosen.length === 0) {
    const title = cleanSubject(subject);
    if (title.length < 3) return [];
    return [
      {
        type: "other",
        title,
        confirmation,
        startDate: dates[0]?.iso ?? "",
        endDate: "",
        time: pasted.time,
        url: pickUrl(urls, "other"),
      },
    ];
  }

  return chosen.map((entry) => {
    if (entry.type === "flight") {
      return {
        type: entry.type,
        title: flightTitle(corpus, subject),
        confirmation,
        startDate: dateAfter(corpus, /depart(?:ing|ure)?/i) || dates[0]?.iso || "",
        endDate: "",
        time: timeAfter(corpus, /depart(?:ing|ure)?/i) || pasted.time,
        url: pickUrl(urls, "flight"),
      };
    }
    if (entry.type === "hotel") {
      const start = dateAfter(corpus, /check-?in/i) || dates[0]?.iso || "";
      const end = dateAfter(corpus, /check-?out/i) || dates.find((date) => date.iso !== start)?.iso || "";
      return {
        type: entry.type,
        title: hotelTitle(corpus, subject),
        confirmation,
        startDate: start,
        endDate: end,
        time: timeAfter(corpus, /check-?in/i),
        url: pickUrl(urls, "hotel"),
      };
    }
    if (entry.type === "car") {
      const start = dateAfter(corpus, /pick-?up/i) || dates[0]?.iso || "";
      const end = dateAfter(corpus, /drop-?off/i) || dates.find((date) => date.iso !== start)?.iso || "";
      return {
        type: entry.type,
        title: carTitle(corpus, subject),
        confirmation,
        startDate: start,
        endDate: end,
        time: timeAfter(corpus, /pick-?up/i) || pasted.time,
        url: pickUrl(urls, "car"),
      };
    }
    return {
      type: "activity" as const,
      title: activityTitle(subject),
      confirmation,
      startDate: dates[0]?.iso ?? "",
      endDate: "",
      time: pasted.time,
      url: pickUrl(urls, "activity"),
    };
  });
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export function formatInboundDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return "";
  const month = SHORT_MONTHS[Number(match[2]) - 1];
  if (!month) return "";
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

export function formatInboundWhen(
  suggestion: Pick<ParsedImport, "startDate" | "endDate" | "time" | "confirmation">,
): string {
  const start = formatInboundDate(suggestion.startDate);
  const end =
    suggestion.endDate && suggestion.endDate !== suggestion.startDate
      ? formatInboundDate(suggestion.endDate)
      : "";
  return [
    start && end ? `${start} – ${end}` : start,
    suggestion.time || "",
    suggestion.confirmation ? `Conf. ${suggestion.confirmation}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function laneKeyForImport(
  type: InboundImportType,
  partners: ReadonlyArray<{ key: string; showWhen: string }>,
): string | undefined {
  if (type === "flight") return partners.find((partner) => partner.showWhen === "flights")?.key;
  if (type === "hotel") return partners.find((partner) => partner.showWhen === "hotel")?.key;
  if (type === "car") return partners.find((partner) => partner.showWhen === "car")?.key;
  if (type === "activity") return partners.find((partner) => partner.key === "viator")?.key;
  return undefined;
}

/** Turn an accepted suggestion into a normal itinerary item. Status is booked. */
export function suggestionToTripItem(
  suggestion: Pick<
    ParsedImport,
    "type" | "title" | "url" | "confirmation" | "startDate" | "endDate" | "time"
  >,
  options: { sortOrder: number; days?: readonly TripDay[]; laneKey?: string },
): TripItem {
  const type: TripItemType = suggestion.type;
  const dayFromStart = suggestion.startDate
    ? mentionedTripDay([...(options.days ?? [])], suggestion.startDate)
    : null;
  const through =
    suggestion.endDate && suggestion.endDate !== suggestion.startDate
      ? `Through ${formatInboundDate(suggestion.endDate) || suggestion.endDate}`
      : "";
  return createTripItem({
    type,
    title: suggestion.title,
    url: suggestion.url,
    confirmation: suggestion.confirmation,
    time: suggestion.time,
    notes: through,
    status: "booked",
    sortOrder: options.sortOrder,
    dayIndex: dayFromStart,
    laneKey: options.laneKey,
  });
}
