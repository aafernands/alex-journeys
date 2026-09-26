/**
 * Signed-in reader context for My Journey → Help (server only).
 * The account email is read from the profile (not the session token) and
 * only used to match tickets when it is verified.
 */
import { auth } from "@/auth";
import { isFirebaseConfigured } from "@/lib/firebase-admin";
import { getTicket, listTicketsForReader } from "@/lib/support-store";
import { readerOwnsTicket, sortByLatest, type SupportTicket, type TicketMessage } from "@/lib/support-tickets";
import { getUserById } from "@/lib/users";

export type SupportReader = {
  userId: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
};

export async function currentSupportReader(): Promise<SupportReader | null> {
  const session = await auth().catch(() => null);
  const userId = session?.user?.id?.trim();
  if (!userId) return null;
  let email = session?.user?.email?.trim().toLowerCase() || null;
  let emailVerified = false;
  let name = session?.user?.name?.trim() || null;
  if (isFirebaseConfigured()) {
    const profile = await getUserById(userId).catch(() => null);
    if (profile?.disabled) return null;
    if (profile) {
      email = profile.email || email;
      emailVerified = profile.emailVerified;
      name = profile.name?.trim() || name;
    }
  }
  return { userId, name, email, emailVerified };
}

export async function readerTickets(reader: SupportReader): Promise<SupportTicket[]> {
  const rows = await listTicketsForReader({
    userId: reader.userId,
    email: reader.emailVerified ? reader.email : null,
  });
  return sortByLatest(rows.filter((t) => readerOwnsTicket(t, reader)));
}

/** The ticket and its thread, or null when missing or not this reader's. */
export async function readerTicket(
  reader: SupportReader,
  ticketNumber: string,
): Promise<{ ticket: SupportTicket; messages: TicketMessage[] } | null> {
  const found = await getTicket(ticketNumber);
  if (!found || !readerOwnsTicket(found.ticket, reader)) return null;
  return found;
}
