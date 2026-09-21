import { Suspense } from "react";
import { AdminBar } from "@/components/admin/AdminBar";
import { AdminEditShortcut } from "@/components/admin/AdminEditShortcut";
import type { AdminEditLink } from "@/lib/admin-edit";
import { hasOauthAdminSession } from "@/lib/cms/auth";

type ChromeProps = {
  editHref: string;
  editLabel: string;
  extraLinks?: AdminEditLink[];
  /** Title-adjacent / inline chip next to the heading. */
  showChip?: boolean;
  chipVariant?: "chip" | "on-photo";
};

async function AdminPublicChromeInner({
  editHref,
  editLabel,
  extraLinks,
  showChip = true,
  chipVariant = "chip",
}: ChromeProps) {
  if (!(await hasOauthAdminSession())) return null;

  return (
    <>
      <AdminBar
        editHref={editHref}
        editLabel={editLabel}
        extraLinks={extraLinks}
      />
      {showChip ? (
        <AdminEditShortcut
          href={editHref}
          label={editLabel}
          variant={chipVariant}
        />
      ) : null}
    </>
  );
}

/**
 * Admin-only public chrome: slim bar (CMS / Edit this / Comments)
 * plus an optional inline Edit chip. Server-gated via Auth.js
 * `session.user.isAdmin` — not present in HTML for anyone else.
 */
export function AdminPublicChrome(props: ChromeProps) {
  return (
    <Suspense fallback={null}>
      <AdminPublicChromeInner {...props} />
    </Suspense>
  );
}

async function AdminSectionEditInner({
  href,
  label,
  variant = "chip",
}: {
  href: string;
  label: string;
  variant?: "chip" | "on-photo";
}) {
  if (!(await hasOauthAdminSession())) return null;
  return <AdminEditShortcut href={href} label={label} variant={variant} />;
}

/** Standalone gated chip for homepage section heads and similar. */
export function AdminSectionEdit(props: {
  href: string;
  label: string;
  variant?: "chip" | "on-photo";
}) {
  return (
    <Suspense fallback={null}>
      <AdminSectionEditInner {...props} />
    </Suspense>
  );
}
