# Forward bookings to an itinerary

Travelers on the itinerary hub (`/guides/plan-a-trip`, step 4) can copy a unique address and forward airline, hotel, or car confirmations. The site suggests what it can read. **Nothing is added until they choose Add to itinerary.** Dismiss drops the suggestion.

Guests see **Sign in to get a forward address**. A signed-in itinerary that is not saved yet uses an address tied to the account. A saved trip (`?trip={id}`) gets an address only for that trip. **Turn off forwarding** stops new mail. **Get a new address** retires the old one.

This uses **Resend Inbound** (the same Resend account as password-reset mail). DNS for receiving cannot be finished from the repo. The hub, webhook, parsers, and sample harness below are already in the app.

Out of scope: Gmail mailbox scan, scraping booking sites, and silent auto-add.

## What gets stored

Firestore, under the signed-in reader only:

```
inboundRoutes/{localPart}
  userId, scope: "account" | "trip", tripId|null, enabled, createdAt, updatedAt
  Optional: rotatedAt (replaced), retired: true (trip deleted). The doc is not removed.

users/{userId}/inboundMailbox/settings
  token, enabled, createdAt, updatedAt
users/{userId}/inboundImports/{id}          # account queue
users/{userId}/inboundReceipts/{hash}       # provider message id, so a retry is ignored

users/{userId}/trips/{tripId}/inbound/settings
users/{userId}/trips/{tripId}/inboundImports/{id}
users/{userId}/trips/{tripId}/inboundReceipts/{hash}
```

A suggestion stores: type guess, title, confirmation, dates, time, link, truncated subject, `source: "email"`, and the Resend `email_id`. The raw HTML is read in memory to parse and is **not** written. Deleting a trip removes that trip’s queue and mailbox settings. The route document stays with `enabled: false` so the local-part is never given to another trip. Attachments (PDF-only confirmations) are not read — the subject can still become a suggestion to dismiss or edit.

The webhook looks up `inboundRoutes/{localPart}` so it does not scan every user. `localPart` is either a legacy 32-hex token or a friendly `name-NN`.

## Env

Set these on Vercel (Production and Preview). The build still succeeds when they are missing.

| Variable | Required | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` | To read the email body | Already used to send auth mail. Use a **full-access** key. A send-only key can still verify webhooks, but the body fetch fails and parsing falls back to the subject. |
| `RESEND_WEBHOOK_SECRET` | To accept real mail | Signing secret from the Resend webhook (`whsec_…`). Unsigned posts to `/api/inbound/email` are rejected. |
| `INBOUND_EMAIL_DOMAIN` | Recommended | Host on the copied address. Default if unset: `inbound.fernandesjourneys.com`. Must match the receiving domain below. |
| `INBOUND_SAMPLE_SECRET` | Only for the harness | Long random string. If unset, `POST /api/inbound/email/sample` returns **404**. |

Do not commit the secrets.

## DNS and Resend (Alex)

Do **not** put this MX on the root domain `fernandesjourneys.com`. That domain already receives mail. Resend delivers only to the MX with the lowest priority number, so a root MX would either steal all mail or never see it.

1. Resend → **Domains** → **Add domain** → `inbound.fernandesjourneys.com`.
2. Add the DKIM (and any SPF) records Resend shows for that subdomain. Wait until the domain is verified.
3. On that domain, turn **Receiving** on.
4. At the DNS host (Cloudflare for this site), add the MX Resend shows. Copy the mail server from the dialog — it is region-specific. The usual value is:

   | Type | Name | Mail server | Priority |
   | --- | --- | --- | --- |
   | MX | `inbound` | `inbound-smtp.us-east-1.amazonaws.com` | `10` |

   Name `inbound` on `fernandesjourneys.com` is `inbound.fernandesjourneys.com`. Priority **10** must be the only / lowest MX on that subdomain. TTL Auto is fine.
5. In Resend, click **I’ve added the record** and wait until receiving shows verified.
6. Resend → **Webhooks** → **Add** →
   - Endpoint: `https://www.fernandesjourneys.com/api/inbound/email`
   - Event: `email.received`
   - Copy the signing secret into `RESEND_WEBHOOK_SECRET`.
7. Set `INBOUND_EMAIL_DOMAIN=inbound.fernandesjourneys.com` and redeploy.

Preview deploys can use the same webhook only if you point a second webhook at the preview URL. Real forwards should hit production. Use the sample harness on a preview when DNS is not ready.

Address shape for a **new** mailbox (and for **Get a new address**): `{slug}-{NN}@inbound.fernandesjourneys.com`, for example `alex-24@inbound.fernandesjourneys.com`.

- `slug` is the reader’s first name: lowercase ASCII letters, digits, and hyphens (`José María` → `jose`, `Mary-Jane` → `mary-jane`). A signed-in reader whose display name is blank or has no letters or digits gets the stem `trip` (`trip-17@…`). Guests still see **Sign in to get a forward address** and do not receive one.
- `NN` is an unused two-digit suffix (`00`–`99`), chosen at random so the first address is not always `-00`. The route document is the uniqueness check. An address already stored — including one that was replaced, turned off, or left behind when a trip was deleted — is never assigned again.
- The same first name shares those 100 suffixes across the whole site. When all 100 are taken, the next address uses a three-digit suffix (`alex-042`), then four (`alex-0042`). New mail does not go back to a 32-character hex token.
- Mailboxes that already have a 32-hex local-part **keep it** until the reader chooses **Get a new address**. Copy address copies whatever is stored.

`trip+{local-part}@` on that host is also accepted, in case a forwarder keeps plus-addressing. The hub copies the plain address. The webhook resolves both the friendly form and the legacy hex form.

## Webhook

`POST /api/inbound/email`

Resend signs the **raw** body (Svix). Headers: `svix-id`, `svix-timestamp`, `svix-signature`. The handler checks the HMAC and a 5-minute timestamp window before parsing.

`email.received` does **not** include the body. After a valid signature the handler calls `GET https://api.resend.com/emails/receiving/{email_id}` with `RESEND_API_KEY`, parses subject + text (HTML only if text is missing), then discards the body.

Example metadata payload (what Resend posts):

```json
{
  "type": "email.received",
  "created_at": "2026-09-21T12:00:00.000Z",
  "data": {
    "email_id": "56761188-7520-42d8-8898-ff6fc54ce618",
    "from": "united@example.com",
    "to": ["alex-24@inbound.fernandesjourneys.com"],
    "cc": [],
    "bcc": [],
    "received_for": [],
    "message_id": "<abc@example.com>",
    "subject": "Your United Airlines booking confirmation",
    "attachments": []
  }
}
```

Responses:

| Situation | Status |
| --- | --- |
| Bad or missing signature | **400** |
| Secret or Firestore not configured | **503** (Resend retries) |
| Accepted, including unknown / disabled / duplicate | **200** `{ "ok": true, "stored": 0, "ignored": "…" }` |

Unknown addresses are not written. Disabled and replaced addresses are ignored.

## Sample harness (no DNS)

1. Set `INBOUND_SAMPLE_SECRET` on the deployment you are calling (Preview is enough).
2. Sign in, open the itinerary hub, and **Copy address**.
3. Put that address in `to` in `scripts/fixtures/inbound-sample.json` (the committed file has a placeholder).
4. POST it:

```bash
curl -sS -X POST "$PREVIEW_URL/api/inbound/email/sample" \
  -H "content-type: application/json" \
  -H "x-inbound-sample-secret: $INBOUND_SAMPLE_SECRET" \
  -d @scripts/fixtures/inbound-sample.json
```

A first success looks like `{ "ok": true, "stored": 1 }`. The same `messageId` again returns `"ignored": "duplicate"`. Reload the hub: **Suggested imports** shows the flight. **Add to itinerary** marks it booked on the matching day when the date is on the trip. **Dismiss** removes it without adding.

Hotel-shaped body you can send the same way (change `messageId` each time you want a new row):

```json
{
  "to": "alex-24@inbound.fernandesjourneys.com",
  "subject": "Reservation confirmed — Alfama apartment",
  "text": "Check-in: Monday, April 12, 2027\nCheck-out: April 19, 2027\nConfirmation code: HMAB12CD\nhttps://www.airbnb.com/trips/HMAB12CD\n",
  "messageId": "sample-airbnb-hmab12cd"
}
```

Wrong secret → **401**. Secret unset → **404**. Anyone with the secret and a copied address can insert suggestions, so treat it like an admin secret.

## Reader API

Session required. **401** signed out. **503** when Firebase env is missing. One reader cannot open another’s queue.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/trips/forward` | Account address (created on first load) and pending suggestions |
| PATCH | `/api/trips/forward` | `{ "enabled": false }` or `{ "rotate": true }` |
| POST | `/api/trips/forward/imports/[importId]` | `{ "action": "add" }` or `{ "action": "dismiss" }` |
| GET / PATCH | `/api/trips/[id]/forward` | Same, for one saved trip |
| POST | `/api/trips/[id]/forward/imports/[importId]` | Add or dismiss a trip suggestion |

Add only closes the suggestion. The hub inserts the itinerary item in the browser, then the existing trip save writes it. The server does not append items by itself.

## Parsers

`src/lib/inbound-parse.ts` is heuristic: confirmation labels, a short airline-code list, check-in/out, pickup/drop-off, and a few brand names (United, Airbnb, Booking.com, Hertz, and similar). It can miss or misread. The queue is the review step. Tests live in `scripts/inbound.test.mjs`.

## Code map

- `src/lib/inbound-address.ts` — friendly local-parts, legacy hex tokens, and recipient parsing
- `src/lib/inbound-parse.ts` — heuristics and “add” → trip item
- `src/lib/inbound-webhook.ts` — Svix check, sample body, receiving fetch
- `src/lib/inbound-store.ts` — Firestore
- `src/app/api/inbound/email/route.ts` — webhook
- `src/app/api/inbound/email/sample/route.ts` — harness
- `src/components/trip-planner/ForwardBookings.tsx` — hub section
