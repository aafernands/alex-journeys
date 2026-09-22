"use client";

import { ProfileAvatar } from "@/components/account/ProfileAvatar";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

export type ProfileSettingsFormProps = {
  initialName: string;
  initialEmail: string;
  initialImage: string | null;
  hasPassword: boolean;
  pendingNewEmail: string | null;
  emailConfigured: boolean;
};

export function ProfileSettingsForm({
  initialName,
  initialEmail,
  initialImage,
  hasPassword,
  pendingNewEmail: initialPending,
  emailConfigured,
}: ProfileSettingsFormProps) {
  const { data: session, update } = useSession();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName);
  const [imageUrl, setImageUrl] = useState(
    initialImage && !initialImage.startsWith("data:") ? initialImage : "",
  );
  const [preview, setPreview] = useState<string | null>(initialImage);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profilePending, setProfilePending] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const [pendingNewEmail, setPendingNewEmail] = useState(initialPending);
  /** Server Firestore email; kept in sync when Account RSC re-renders. */
  const [serverEmail, setServerEmail] = useState(initialEmail);

  useEffect(() => {
    setServerEmail(initialEmail);
    setPendingNewEmail(initialPending);
  }, [initialEmail, initialPending]);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  useEffect(() => {
    setPreview(initialImage);
    setImageUrl(
      initialImage && !initialImage.startsWith("data:") ? initialImage : "",
    );
  }, [initialImage]);

  // Prefer server Firestore email (initialEmail) over a stale client JWT.
  // Session is only a fallback when the server did not supply an email.
  const displayEmail = serverEmail || session?.user?.email || "";
  const displayImage = session?.user?.image ?? preview;

  async function onSaveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(null);
    setProfilePending(true);
    try {
      let res: Response;
      if (pendingFile) {
        const form = new FormData();
        form.set("name", name.trim());
        form.set("file", pendingFile);
        res = await fetch("/api/account/profile", {
          method: "PATCH",
          body: form,
        });
      } else {
        const body: { name: string; imageUrl?: string; clearImage?: boolean } =
          {
            name: name.trim(),
          };
        if (imageUrl.trim()) {
          body.imageUrl = imageUrl.trim();
        }
        res = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        name?: string | null;
        image?: string | null;
      };
      if (!res.ok) {
        setProfileError(data.error || "Could not update profile.");
        setProfilePending(false);
        return;
      }
      setProfileSuccess(data.message || "Profile updated.");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      if (typeof data.image === "string" || data.image === null) {
        setPreview(data.image);
        if (data.image && !data.image.startsWith("data:")) {
          setImageUrl(data.image);
        }
      }
      await update({
        name: data.name ?? name.trim(),
        image: data.image ?? preview,
      });
      router.refresh();
      setProfilePending(false);
    } catch {
      setProfileError("Network error. Try again.");
      setProfilePending(false);
    }
  }

  async function onRequestEmailChange(e: FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    setEmailPending(true);
    try {
      const res = await fetch("/api/auth/change-email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newEmail,
          ...(hasPassword ? { currentPassword } : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        message?: string;
        pendingNewEmail?: string;
      };
      if (!res.ok) {
        setEmailError(data.error || "Could not request email change.");
        setEmailPending(false);
        return;
      }
      setEmailSuccess(
        data.message || "Check your new inbox to confirm the email change.",
      );
      setPendingNewEmail(data.pendingNewEmail ?? newEmail.trim().toLowerCase());
      setNewEmail("");
      setCurrentPassword("");
      setEmailPending(false);
    } catch {
      setEmailError("Network error. Try again.");
      setEmailPending(false);
    }
  }

  async function onCancelPending() {
    setEmailError(null);
    setEmailSuccess(null);
    setEmailPending(true);
    try {
      const res = await fetch("/api/auth/change-email/cancel", {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setEmailError(data.error || "Could not cancel.");
        setEmailPending(false);
        return;
      }
      setPendingNewEmail(null);
      setEmailSuccess(data.message || "Pending email change cancelled.");
      setEmailPending(false);
    } catch {
      setEmailError("Network error. Try again.");
      setEmailPending(false);
    }
  }

  function onFileChange(file: File | null) {
    setPendingFile(file);
    setProfileError(null);
    if (!file) return;
    if (file.size > 400 * 1024) {
      setProfileError("Image too large. Max is about 400KB.");
      setPendingFile(null);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-6 space-y-8">
      <form className="space-y-4" onSubmit={onSaveProfile}>
        <div>
          <label
            htmlFor="profile-name"
            className="block text-sm font-semibold text-heading"
          >
            Display name
          </label>
          <input
            id="profile-name"
            type="text"
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <div>
          <label
            htmlFor="profile-photo-file"
            className="block text-sm font-semibold text-heading"
          >
            Profile photo
          </label>
          <p className="mt-1 text-xs text-muted">
            JPEG, PNG, or WebP, up to about 400KB. Or paste an image link. A
            Google or X photo stays until you set your own.
          </p>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ProfileAvatar
              src={displayImage}
              name={name}
              email={displayEmail}
              size="settings"
              alt=""
            />
            <input
              ref={fileRef}
              id="profile-photo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block min-w-0 flex-1 text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-surface-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-heading"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
          <input
            id="profile-photo-url"
            type="url"
            placeholder="https://…"
            value={imageUrl}
            onChange={(e) => {
              setImageUrl(e.target.value);
              setPendingFile(null);
              if (fileRef.current) fileRef.current.value = "";
              if (e.target.value.trim()) setPreview(e.target.value.trim());
            }}
            className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
          />
        </div>

        <button
          type="submit"
          disabled={profilePending}
          className="btn btn-secondary disabled:opacity-60"
        >
          {profilePending ? "Saving…" : "Save profile"}
        </button>
        {profileError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {profileError}
          </p>
        ) : null}
        {profileSuccess ? (
          <p className="text-sm font-medium text-heading" role="status">
            {profileSuccess}
          </p>
        ) : null}
      </form>

      <div className="border-t border-border pt-6">
        <h3 className="font-display text-lg font-bold text-heading">
          Email address
        </h3>
        <p className="mt-1 text-sm text-muted">
          Current:{" "}
          <span className="font-medium text-heading">{displayEmail}</span>
          <span className="text-muted"> · verified</span>
        </p>
        {pendingNewEmail ? (
          <div className="mt-3 rounded-lg border border-border bg-surface-soft/60 p-3 text-sm">
            <p className="text-heading">
              Pending change to{" "}
              <span className="font-semibold">{pendingNewEmail}</span>. Check
              that inbox for the confirmation link.
            </p>
            <button
              type="button"
              disabled={emailPending}
              onClick={() => void onCancelPending()}
              className="mt-2 text-sm font-semibold text-accent hover:underline disabled:opacity-60"
            >
              Cancel pending change
            </button>
          </div>
        ) : null}

        {!emailConfigured ? (
          <p className="mt-3 text-sm text-muted" role="status">
            Changing your email isn’t available right now. Try again later.
          </p>
        ) : (
          <form className="mt-4 space-y-4" onSubmit={onRequestEmailChange}>
            <div>
              <label
                htmlFor="profile-new-email"
                className="block text-sm font-semibold text-heading"
              >
                New email
              </label>
              <input
                id="profile-new-email"
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
              />
            </div>
            {hasPassword ? (
              <div>
                <label
                  htmlFor="profile-email-password"
                  className="block text-sm font-semibold text-heading"
                >
                  Current password
                </label>
                <input
                  id="profile-email-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="mt-2 min-h-11 w-full rounded-lg border border-border bg-white px-4 text-sm text-heading transition focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25"
                />
              </div>
            ) : (
              <p className="text-xs text-muted">
                You can change this email without a password. After you confirm
                the link, future sign-ins use the new address.
              </p>
            )}
            <button
              type="submit"
              disabled={emailPending}
              className="btn btn-secondary disabled:opacity-60"
            >
              {emailPending ? "Sending…" : "Send confirmation link"}
            </button>
            {emailError ? (
              <p className="text-sm font-medium text-red-600" role="alert">
                {emailError}
              </p>
            ) : null}
            {emailSuccess ? (
              <p className="text-sm font-medium text-heading" role="status">
                {emailSuccess}
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
