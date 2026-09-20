"use client";

import { useState, type FormEvent } from "react";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Could not change password.");
        setPending(false);
        return;
      }
      setSuccess(data.message || "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      setPending(false);
    } catch {
      setError("Network error. Try again.");
      setPending(false);
    }
  }

  return (
    <form className="mt-4 space-y-4" onSubmit={onSubmit}>
      <div>
        <label
          htmlFor="change-current"
          className="block text-sm font-semibold text-heading"
        >
          Current password
        </label>
        <input
          id="change-current"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      <div>
        <label
          htmlFor="change-new"
          className="block text-sm font-semibold text-heading"
        >
          New password
        </label>
        <input
          id="change-new"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
        <p className="mt-1.5 text-xs text-muted">At least 8 characters.</p>
      </div>
      <div>
        <label
          htmlFor="change-confirm"
          className="block text-sm font-semibold text-heading"
        >
          Confirm new password
        </label>
        <input
          id="change-confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-secondary disabled:opacity-60"
      >
        {pending ? "Updating…" : "Change password"}
      </button>
      {error ? (
        <p className="text-sm font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm font-medium text-heading" role="status">
          {success}
        </p>
      ) : null}
    </form>
  );
}
