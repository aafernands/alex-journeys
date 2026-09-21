"use client";

import Link from "next/link";
import { useState } from "react";
import type { NavChild } from "@/data/nav";

type Props = {
  label: string;
  href: string;
  items: Pick<NavChild, "title" | "href">[];
  onNavigate: () => void;
  /** First child link, e.g. “All guides”. */
  allLabel?: string;
};

const topClass =
  "font-display flex w-full items-center justify-between gap-3 py-3 text-left text-3xl font-semibold leading-none tracking-tight text-heading transition hover:text-accent";
const midClass =
  "font-display block py-2 text-xl font-semibold leading-snug tracking-tight text-heading transition hover:text-accent";

/**
 * Editorial accordion row for a hub (Guides). No leading icons.
 * Children sit one type size down from the oversized primary list.
 */
export function MobileTopicSection({
  label,
  href,
  items,
  onNavigate,
  allLabel,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <button
        type="button"
        className={topClass}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <Chevron open={open} size={20} />
      </button>
      {open ? (
        <ul className="mb-3 ml-0.5 border-l border-border pl-4">
          <li>
            <Link href={href} className={midClass} onClick={onNavigate}>
              {allLabel ?? `All ${label.toLowerCase()}`}
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={midClass} onClick={onNavigate}>
                {item.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function Chevron({
  open,
  size = 16,
}: {
  open: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`shrink-0 text-heading/55 transition ${open ? "rotate-180" : ""}`}
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
