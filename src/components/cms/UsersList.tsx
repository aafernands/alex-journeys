"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  MoreHorizontal,
  Search,
  Trash2,
} from "lucide-react";
import type { UserPublic } from "@/lib/user-types";

type Props = {
  users: UserPublic[];
};

type PendingAction = "toggle" | "delete" | "send-reset";

type RowFeedback = {
  userId: string;
  kind: "success" | "error";
  message: string;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

type RowActionsProps = {
  user: UserPublic;
  busy: boolean;
  pendingAction: PendingAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendReset: () => void;
  onToggle: () => void;
  onDelete: () => void;
  feedback: RowFeedback | null;
};

function RowActions({
  user,
  busy,
  pendingAction,
  open,
  onOpenChange,
  onSendReset,
  onToggle,
  onDelete,
  feedback,
}: RowActionsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const placeMenu = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 208;
    const pad = 8;
    const left = Math.min(
      Math.max(pad, rect.right - menuWidth),
      window.innerWidth - menuWidth - pad,
    );
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 160 && rect.top > spaceBelow;
    setMenuStyle({
      position: "fixed",
      left,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      width: menuWidth,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        close();
      }
    };
    const onReposition = () => placeMenu();
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open, close, placeMenu]);

  const itemClass =
    "flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm font-medium text-heading transition hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-50";

  const canSendReset = !user.disabled && Boolean(user.email?.trim());
  const resetTitle = user.disabled
    ? "Enable the account before sending a reset link"
    : !user.email?.trim()
      ? "User has no email"
      : "Email a 1-hour password reset link (same as forgot-password)";

  const sending = busy && pendingAction === "send-reset";
  const toggling = busy && pendingAction === "toggle";
  const deleting = busy && pendingAction === "delete";

  return (
    <div className="relative flex flex-col items-end gap-1" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-heading transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/25 disabled:opacity-60"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        aria-label={`Actions for ${user.email || user.name || user.id}`}
        disabled={busy}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          placeMenu();
          onOpenChange(true);
        }}
      >
        {busy ? (
          <span className="text-xs font-semibold text-muted">…</span>
        ) : (
          <MoreHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
        )}
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="User actions"
          style={menuStyle}
          className="z-50 rounded-xl border border-border bg-white py-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={busy || !canSendReset}
            title={resetTitle}
            onClick={() => {
              close();
              onSendReset();
            }}
          >
            <KeyRound
              className="h-4 w-4 shrink-0 text-accent"
              strokeWidth={2}
              aria-hidden
            />
            {sending ? "Sending…" : "Send reset link"}
          </button>

          <button
            type="button"
            role="menuitem"
            className={itemClass}
            disabled={busy}
            onClick={() => {
              close();
              onToggle();
            }}
          >
            {user.disabled ? (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-emerald-700"
                strokeWidth={2}
                aria-hidden
              />
            ) : (
              <Ban
                className="h-4 w-4 shrink-0 text-muted"
                strokeWidth={2}
                aria-hidden
              />
            )}
            {toggling ? "…" : user.disabled ? "Enable" : "Disable"}
          </button>

          <div className="my-1 border-t border-border" />

          <button
            type="button"
            role="menuitem"
            className={`${itemClass} text-red-700 hover:bg-red-50`}
            disabled={busy}
            onClick={() => {
              close();
              onDelete();
            }}
          >
            <Trash2
              className="h-4 w-4 shrink-0 text-red-600"
              strokeWidth={2}
              aria-hidden
            />
            {deleting ? "…" : "Delete"}
          </button>
        </div>
      ) : null}

      {feedback && feedback.userId === user.id ? (
        <p
          className={`max-w-[11rem] text-right text-[11px] font-medium leading-snug ${
            feedback.kind === "success" ? "text-emerald-800" : "text-red-600"
          }`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}

export function UsersList({ users }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<RowFeedback | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.name?.toLowerCase().includes(q) ?? false) ||
        u.id.toLowerCase().includes(q) ||
        u.providers.some((p) => p.includes(q)),
    );
  }, [users, query]);

  function beginAction(userId: string, action: PendingAction) {
    setFeedback(null);
    setPendingId(userId);
    setPendingAction(action);
  }

  function endAction() {
    setPendingId(null);
    setPendingAction(null);
  }

  async function toggleDisabled(user: UserPublic) {
    beginAction(user.id, "toggle");
    try {
      const res = await fetch(`/api/cms/users/${encodeURIComponent(user.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: !user.disabled }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({
          userId: user.id,
          kind: "error",
          message: data.error || "Update failed.",
        });
        endAction();
        return;
      }
      setFeedback({
        userId: user.id,
        kind: "success",
        message: user.disabled ? "Enabled." : "Disabled.",
      });
      router.refresh();
      endAction();
    } catch {
      setFeedback({
        userId: user.id,
        kind: "error",
        message: "Network error. Try again.",
      });
      endAction();
    }
  }

  async function removeUser(user: UserPublic) {
    if (
      !window.confirm(
        `Delete profile for “${user.email || user.id}”? This removes the Firestore user document. Saved-post subcollections may remain as orphans.`,
      )
    ) {
      return;
    }
    beginAction(user.id, "delete");
    try {
      const res = await fetch(`/api/cms/users/${encodeURIComponent(user.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedback({
          userId: user.id,
          kind: "error",
          message: data.error || "Delete failed.",
        });
        endAction();
        return;
      }
      setFeedback(null);
      router.refresh();
      endAction();
    } catch {
      setFeedback({
        userId: user.id,
        kind: "error",
        message: "Network error. Try again.",
      });
      endAction();
    }
  }

  async function sendResetLink(user: UserPublic) {
    if (!user.email?.trim()) {
      setFeedback({
        userId: user.id,
        kind: "error",
        message: "This user has no email address.",
      });
      return;
    }
    beginAction(user.id, "send-reset");
    try {
      const res = await fetch(
        `/api/cms/users/${encodeURIComponent(user.id)}/send-reset`,
        { method: "POST" },
      );
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        email?: string;
      };
      if (!res.ok) {
        setFeedback({
          userId: user.id,
          kind: "error",
          message: data.error || "Could not send reset email.",
        });
        endAction();
        return;
      }
      const emailed = data.email || user.email;
      setFeedback({
        userId: user.id,
        kind: "success",
        message: data.message || `Reset email sent to ${emailed}.`,
      });
      endAction();
    } catch {
      setFeedback({
        userId: user.id,
        kind: "error",
        message: "Network error. Try again.",
      });
      endAction();
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, provider…"
          className="min-h-11 w-full rounded-lg border border-border bg-white py-2 pl-10 pr-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm text-muted">
            {users.length === 0
              ? "No users yet. Profiles appear after Google, X, or email sign-in."
              : "No users match your search."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-soft text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Providers</th>
                <th className="px-4 py-3 font-semibold">Created</th>
                <th className="px-4 py-3 font-semibold">Last login</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const busy = pendingId === u.id;
                return (
                  <tr
                    key={u.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-heading">
                        {u.name?.trim() || "—"}
                      </p>
                      <p className="text-xs text-muted">
                        {u.email || "No email"}
                      </p>
                      <p className="mt-0.5 max-w-[12rem] truncate font-mono text-[10px] text-muted">
                        {u.id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {u.providers.length === 0 ? (
                          <span className="text-xs text-muted">—</span>
                        ) : (
                          u.providers.map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-medium text-heading"
                            >
                              {p}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatWhen(u.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatWhen(u.lastLoginAt)}
                    </td>
                    <td className="px-4 py-3">
                      {u.disabled ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Disabled
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <RowActions
                        user={u}
                        busy={busy}
                        pendingAction={busy ? pendingAction : null}
                        open={openMenuId === u.id}
                        onOpenChange={(next) =>
                          setOpenMenuId(next ? u.id : null)
                        }
                        onSendReset={() => void sendResetLink(u)}
                        onToggle={() => void toggleDisabled(u)}
                        onDelete={() => void removeUser(u)}
                        feedback={
                          feedback?.userId === u.id ? feedback : null
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
