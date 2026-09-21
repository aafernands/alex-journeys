"use client";

import { AdminBar } from "@/components/admin/AdminBar";
import { AdminEditShortcut } from "@/components/admin/AdminEditShortcut";
import { AdminGate } from "@/components/admin/AdminGate";
import type { AdminEditLink } from "@/lib/admin-edit";

type Props = {
  editHref: string;
  editLabel: string;
  extraLinks?: AdminEditLink[];
  /** Title-adjacent / inline chip next to the heading. */
  showChip?: boolean;
  chipVariant?: "chip" | "on-photo";
};

/**
 * Admin-only public chrome: slim bar (CMS / Edit this / Comments)
 * plus an optional inline Edit chip. Session-gated — not rendered
 * for readers or non-admin signed-in users.
 */
export function AdminPublicChrome({
  editHref,
  editLabel,
  extraLinks,
  showChip = true,
  chipVariant = "chip",
}: Props) {
  return (
    <AdminGate>
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
    </AdminGate>
  );
}

/** Standalone gated chip for homepage section heads and similar. */
export function AdminSectionEdit({
  href,
  label,
  variant = "chip",
}: {
  href: string;
  label: string;
  variant?: "chip" | "on-photo";
}) {
  return (
    <AdminGate>
      <AdminEditShortcut href={href} label={label} variant={variant} />
    </AdminGate>
  );
}
