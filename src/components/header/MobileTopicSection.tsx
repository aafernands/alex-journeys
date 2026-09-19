"use client";

import Link from "next/link";
import { useState } from "react";
import { NavIcon } from "@/components/icons/NavIcon";
import type { NavChild } from "@/data/nav";

type Props = {
  label: string;
  href: string;
  items: NavChild[];
  onNavigate: () => void;
};

export function MobileTopicSection({ label, href, items, onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <li>
      <button
        type="button"
        className="flex w-full items-center justify-between py-2.5 text-base font-semibold tracking-tight text-heading"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <ul className="mb-2 space-y-0.5 border-l border-surface pl-2">
          <li>
            <Link
              href={href}
              className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-semibold text-heading hover:bg-surface-soft hover:text-accent"
              onClick={onNavigate}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-soft text-accent">
                <NavIcon name="compass" size={18} />
              </span>
              All {label.toLowerCase()}
            </Link>
          </li>
          {items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm text-text hover:bg-surface-soft hover:text-accent"
                onClick={onNavigate}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-soft text-accent">
                  <NavIcon name={item.icon} size={18} />
                </span>
                <span>
                  <span className="block font-semibold text-heading">
                    {item.title}
                  </span>
                  {item.description ? (
                    <span className="block text-xs text-muted line-clamp-1">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}
