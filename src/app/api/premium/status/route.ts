import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isPremium, toMembershipPublic } from "@/lib/membership";
import { getMembership } from "@/lib/membership-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id?.trim();
  if (!userId) {
    return NextResponse.json({ signedIn: false, isPremium: false, membership: null });
  }
  try {
    const membership = await getMembership(userId);
    const publicMembership = toMembershipPublic(membership);
    return NextResponse.json({
      signedIn: true,
      isPremium: isPremium({ membership: publicMembership }),
      membership: membership ? publicMembership : null,
    });
  } catch (err) {
    console.error("[premium] status failed:", err);
    return NextResponse.json(
      { signedIn: true, isPremium: false, membership: null, unavailable: true },
      { status: 200 },
    );
  }
}
