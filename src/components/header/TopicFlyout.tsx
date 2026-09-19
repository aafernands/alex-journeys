"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { NavIcon } from "@/components/icons/NavIcon";
import type { NavChild } from "@/data/nav";

type Props = {
  label: string;
  href: string;
  items: NavChild[];
  navLinkClass: string;
  chevronClass: string;
  onNavigate?: () => void;
};

export function TopicFlyout({
  label,
  href,
  items,
  navLinkClass,
  chevronClass,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div
      className="relative"
      ref={wrapRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`inline-flex items-center gap-1.5 font-sans text-sm font-extrabold uppercase tracking-wide transition ${navLinkClass}`}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${chevronClass} transition ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className="absolute left-1/2 top-full z-50 mt-3 w-[22rem] -translate-x-1/2 rounded-xl border border-surface bg-white py-2 shadow-[0_16px_40px_-20px_rgba(12,13,14,0.35)]"
        >
          <Link
            href={href}
            role="menuitem"
            className="mx-2 mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-heading transition hover:bg-surface-soft hover:text-accent"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
          >
            All {label.toLowerCase()}
          </Link>
          <ul className="max-h-[min(70vh,28rem)] overflow-y-auto px-2 pb-1">
            {items.map((item) => (
              <li key={item.href} role="none">
                <Link
                  href={item.href}
                  role="menuitem"
                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-surface-soft"
                  onClick={() => {
                    setOpen(false);
                    onNavigate?.();
                  }}
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-soft text-accent">
                    <NavIcon name={item.icon} size={16} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-heading">
                      {item.title}
                    </span>
                    {item.description ? (
                      <span className="mt-0.5 block text-xs leading-snug text-muted">
                        {item.description}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
