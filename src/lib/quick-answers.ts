/**
 * "Quick answers" on /contact. Content lives in the contact page JSON
 * (`sections.quickAnswers`) so it can be edited from the CMS page editor:
 *
 *   { "title": "Quick answers",
 *     "items": [{ "question": "…", "answer": "…",
 *                 "linkLabel": "optional", "linkHref": "/optional-site-path" }] }
 *
 * Links must be on this site (start with "/"); anything else is dropped.
 */
import { asRecord, asString } from "@/lib/cms-section-utils";

export type QuickAnswer = {
  question: string;
  answer: string;
  link: { label: string; href: string } | null;
};

export type QuickAnswers = { title: string; items: QuickAnswer[] };

const MAX_ITEMS = 12;

export function isSitePath(href: string): boolean {
  return href.startsWith("/") && !href.startsWith("//") && !/[\s\\]/.test(href);
}

export function parseQuickAnswers(raw: unknown): QuickAnswers {
  const record = asRecord(raw);
  const list = Array.isArray(record.items) ? record.items : [];
  const items: QuickAnswer[] = [];
  for (const entry of list) {
    const item = asRecord(entry);
    const question = asString(item.question).trim();
    const answer = asString(item.answer).trim();
    if (!question || !answer) continue;
    const label = asString(item.linkLabel).trim();
    const href = asString(item.linkHref).trim();
    items.push({ question, answer, link: label && href && isSitePath(href) ? { label, href } : null });
    if (items.length >= MAX_ITEMS) break;
  }
  return { title: asString(record.title).trim() || "Quick answers", items };
}
