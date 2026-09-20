import { NextResponse } from "next/server";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import {
  listUsersSafe,
  UsersUnavailableError,
} from "@/lib/users";

export const runtime = "nodejs";

/** GET /api/cms/users — list reader profiles (no passwordHash). */
export async function GET() {
  if (!(await isCmsAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured." },
      { status: 503 },
    );
  }
  try {
    const users = await listUsersSafe();
    return NextResponse.json({ users });
  } catch (err) {
    if (err instanceof UsersUnavailableError) {
      return NextResponse.json(
        { error: "Firestore is not configured." },
        { status: 503 },
      );
    }
    console.error("[api/cms/users] GET failed:", err);
    return NextResponse.json(
      { error: "Could not load users." },
      { status: 500 },
    );
  }
}
