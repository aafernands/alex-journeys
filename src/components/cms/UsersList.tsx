"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import type { UserPublic } from "@/lib/user-types";

type Props = {
  users: UserPublic[];
};

type PendingAction = "toggle" | "delete" | "send-reset";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function UsersList({ users }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    setError(null);
    setSuccess(null);
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
        setError(data.error || "Update failed.");
        endAction();
        return;
      }
      router.refresh();
      endAction();
    } catch {
      setError("Network error. Try again.");
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
        setError(data.error || "Delete failed.");
        endAction();
        return;
      }
      router.refresh();
      endAction();
    } catch {
      setError("Network error. Try again.");
      endAction();
    }
  }

  async function sendResetLink(user: UserPublic) {
    if (!user.email?.trim()) {
      setError("This user has no email address.");
      setSuccess(null);
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
        setError(data.error || "Could not send reset email.");
        endAction();
        return;
      }
      const emailed = data.email || user.email;
      setSuccess(data.message || `Reset email sent to ${emailed}.`);
      endAction();
    } catch {
      setError("Network error. Try again.");
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

      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="text-sm font-medium text-emerald-800" role="status">
          {success}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="panel p-6">
          <p className="text-sm text-muted">
            {users.length === 0
              ? "No users yet. Profiles appear after Google or email sign-in."
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
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const busy = pendingId === u.id;
                const sending =
                  busy && pendingAction === "send-reset";
                return (
                  <tr key={u.id} className="border-b border-border last:border-0">
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs"
                          disabled={busy || u.disabled || !u.email?.trim()}
                          title={
                            u.disabled
                              ? "Enable the account before sending a reset link"
                              : !u.email?.trim()
                                ? "User has no email"
                                : "Email a 1-hour password reset link (same as forgot-password)"
                          }
                          onClick={() => void sendResetLink(u)}
                        >
                          {sending ? "Sending…" : "Send reset link"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs"
                          disabled={busy}
                          onClick={() => void toggleDisabled(u)}
                        >
                          {busy && pendingAction === "toggle"
                            ? "…"
                            : u.disabled
                              ? "Enable"
                              : "Disable"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary !min-h-8 !px-3 !py-1 text-xs text-red-700"
                          disabled={busy}
                          onClick={() => void removeUser(u)}
                        >
                          {busy && pendingAction === "delete" ? "…" : "Delete"}
                        </button>
                      </div>
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
