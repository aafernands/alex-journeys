"use client";

import {
  Bookmark,
  History as HistoryIcon,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import type { AccountSection } from "@/lib/account-section";

type Counter = {
  id: AccountSection;
  label: string;
  icon: LucideIcon;
  count: number | null;
};

type Props = {
  name: string;
  email: string;
  image: string | null;
  membershipLabel: string;
  pendingNewEmail: string | null;
  comments: number | null;
  saved: number | null;
  history: number | null;
  onOpen: (id: AccountSection) => void;
};

/**
 * Top of My Journey: who is signed in, the membership label, and three icon
 * counters that open their sections.
 */
export function AccountProfileCard({
  name,
  email,
  image,
  membershipLabel,
  pendingNewEmail,
  comments,
  saved,
  history,
  onOpen,
}: Props) {
  const counters: Counter[] = [
    { id: "comments", label: "Comments", icon: MessageSquare, count: comments },
    { id: "saved", label: "Saved", icon: Bookmark, count: saved },
    { id: "history", label: "History", icon: HistoryIcon, count: history },
  ];

  return (
    <section className="ui-card p-3 sm:p-4" aria-labelledby="journey-identity">
      <div className="flex min-w-0 items-center gap-3">
        <ProfileAvatar src={image} name={name} email={email} />
        <div className="min-w-0">
          <h2
            id="journey-identity"
            className="font-display truncate text-ds-title font-bold text-heading"
          >
            {name}
          </h2>
          <p className="mt-0.5 text-ds-caption uppercase tracking-[0.06em] text-accent-deep">
            {membershipLabel}
          </p>
          {email ? <p className="mt-0.5 truncate text-xs text-muted">{email}</p> : null}
        </div>
      </div>
      {pendingNewEmail ? (
        <p className="mt-3 text-sm text-text">
          Confirm the link sent to{" "}
          <span className="font-semibold text-heading">{pendingNewEmail}</span> to finish
          changing your email.
        </p>
      ) : null}
      <ul className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        {counters.map(({ id, label, icon: Icon, count }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onOpen(id)}
              aria-label={count !== null ? `${label}, ${count}` : label}
              className="flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] py-1 text-heading transition hover:bg-surface-soft"
            >
              <span className="relative inline-flex">
                <Icon className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden="true" />
                {count !== null ? (
                  <span
                    className="absolute -right-3 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-on-solid tabular-nums"
                    aria-hidden="true"
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                ) : null}
              </span>
              <span className="text-ds-caption text-muted">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
