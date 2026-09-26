import { TICKET_STATUS_LABELS, type TicketStatus } from "@/lib/support-tickets";

const STATUS_STYLE: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-900",
  in_progress: "bg-sky-100 text-sky-900",
  waiting: "bg-stone-200 text-stone-800",
  closed: "bg-emerald-100 text-emerald-900",
};

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[status]}`}>
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}
