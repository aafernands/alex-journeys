import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { SupportTicketThread } from "@/components/cms/support/SupportTicketThread";
import { isCmsAuthenticated } from "@/lib/cms/auth";
import { isEmailConfigured } from "@/lib/email";
import { getTicket, markTicketRead, SupportUnavailableError } from "@/lib/support-store";
import { isTicketNumber } from "@/lib/support-tickets";

export const dynamic = "force-dynamic";

export default async function CmsSupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isCmsAuthenticated())) redirect("/cms");
  const { id } = await params;
  const ticketNumber = decodeURIComponent(id);
  if (!isTicketNumber(ticketNumber)) notFound();

  let found: Awaited<ReturnType<typeof getTicket>> = null;
  try {
    found = await getTicket(ticketNumber);
    if (found?.ticket.unreadForStaff) await markTicketRead(ticketNumber);
  } catch (err) {
    if (err instanceof SupportUnavailableError) {
      return (
        <div className="panel p-6">
          <p className="text-sm text-text">Firestore is not configured.</p>
        </div>
      );
    }
    throw err;
  }
  if (!found) notFound();

  return (
    <div className="space-y-6">
      <Link href="/cms/support" className="text-sm font-semibold text-accent hover:text-accent-deep">
        ← All support requests
      </Link>
      <SupportTicketThread
        ticket={{ ...found.ticket, unreadForStaff: false }}
        messages={found.messages}
        emailConfigured={isEmailConfigured()}
      />
    </div>
  );
}
