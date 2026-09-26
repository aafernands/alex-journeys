# Support tickets (Help & Contact)

Modeled on the Nurse Intensive support desk, trimmed to what Alex Journeys needs.

## Reader side

- `/contact` form (guests and signed-in readers): name, email (locked to the
  account email when signed in), topic, optional subject, message. Turnstile
  when configured, a hidden honeypot field, 5 requests per 10 minutes per IP
  and 5 per hour per email.
- On send: a ticket is created with a reference number like `AJ-2026-482913`,
  the reader gets a **"We got your message [AJ-…]"** email with their message
  quoted, and the support inbox gets an alert.
- If tickets can't be saved (e.g. a preview deploy without Firebase), the form
  falls back to the old behavior and opens the reader's email app.
- Readers answer by replying to any support email. With `SUPPORT_INBOUND_EMAIL`
  set, those replies land back on the ticket (see below).

## CMS side (`/cms/support`)

- List with filters: Needs attention (default: everything not closed), Open,
  In progress, Waiting on reader, Closed, All. Search by number, name, email,
  subject or last message. Unread requests show a dot and bold subject.
- Ticket page: full thread (form message, email replies, your replies), reader
  details, status buttons (Open / In progress / Waiting on reader / Close
  request / Reopen), "Email the reader when I close it".
- **Send reply** emails the reader ("Re: {subject} [AJ-…]") and sets the
  status to Waiting on reader. **Send and close** replies and closes.
- Replies are signed with `SUPPORT_REPLY_NAME` or the CMS user's first name
  (default "Alex").

## Statuses

| Status | Set when |
| --- | --- |
| `open` | New request, or the reader replied (also reopens a closed request) |
| `in_progress` | You mark it |
| `waiting` | You replied |
| `closed` | You close it (optionally emails "Your request is resolved") |

## Data (Firestore, Admin SDK only)

- `supportTickets/{ticketNumber}`: ticketNumber, name, email, userId, topic,
  subject, status, createdAt, updatedAt, lastMessageAt, lastMessagePreview,
  messageCount, unreadForStaff, closedAt, source.
- `supportTickets/{ticketNumber}/messages/{id}`: direction (customer|staff),
  channel (form|email|cms), authorName, body, createdAt, providerMessageId
  (email replies use doc id `email_{resendId}` so duplicates are skipped),
  emailStatus (staff replies: sent|skipped|failed).
- Listing reads the latest 300 by `updatedAt` and filters in memory, so no
  composite index is needed.

## Inbound email replies

Uses the existing Resend inbound webhook (`POST /api/inbound/email`, see
[TRIPS-INBOUND.md](./TRIPS-INBOUND.md)).

1. Set `SUPPORT_INBOUND_EMAIL=support@inbound.alexjourneys.com` (any address on
   the Resend receiving domain; `support` does not clash with trip addresses,
   which look like `name-24@…`).
2. Reader emails use it as Reply-To. When a reply arrives, the webhook sees that
   recipient, reads the ticket number from the subject, checks the sender
   matches the ticket email (strangers are ignored), strips quoted text, stores
   the message, reopens the ticket and alerts the support inbox.
3. Without `SUPPORT_INBOUND_EMAIL`, replies go to `EMAIL_REPLY_TO` /
   `SUPPORT_EMAIL` as normal mail and are not threaded.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM`, `SUPPORT_EMAIL` | Same as [EMAILS.md](./EMAILS.md) |
| `SUPPORT_INBOUND_EMAIL` | Optional. Reply-To for reader emails; enables threading of replies. |
| `SUPPORT_NOTIFY_EMAIL` | Optional. Where alerts go. Defaults to `SUPPORT_EMAIL`. |
| `SUPPORT_REPLY_NAME` | Optional. Name shown on your replies. |
| `RESEND_WEBHOOK_SECRET` | Already set for inbound trips; also verifies support replies. |

## Not built (Nurse Intensive has these)

Priorities, assignment, internal notes, history log, feedback rating link,
72-hour auto-close of waiting tickets, attachments.

## Tests

`scripts/support-tickets.test.mjs` (helpers, templates, inbound replies) and
`scripts/support-routes.test.mjs` (form API, CMS auth, reply/close).
