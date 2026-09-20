import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  deleteUserProfile,
  setUserDisabled,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

/** PATCH /api/cms/users/[id] — body `{ disabled: boolean }`. */
export async function PATCH(request: Request, ctx: Ctx) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    typeof (body as { disabled?: unknown }).disabled !== "boolean"
  ) {
    return NextResponse.json(
      { error: "Body must include boolean `disabled`." },
      { status: 400 },
    );
  }

  try {
    const user = await setUserDisabled(
      id,
      (body as { disabled: boolean }).disabled,
    );
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, user });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    console.error("[api/cms/users] PATCH failed:", err);
    return NextResponse.json(
      { error: "Could not update user." },
      { status: 500 },
    );
  }
}

/** DELETE /api/cms/users/[id] — delete profile doc (not saved subcollection). */
export async function DELETE(_request: Request, ctx: Ctx) {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }

  const { id } = await ctx.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  try {
    const ok = await deleteUserProfile(id);
    if (!ok) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    console.error("[api/cms/users] DELETE failed:", err);
    return NextResponse.json(
      { error: "Could not delete user." },
      { status: 500 },
    );
  }
}
