# Saved trips

Plan a trip (`/guides/plan-a-trip`) ends on an **itinerary hub**: one booking lane per selected partner (flights, stay, car, and extras), each with a partner search that opens through `/out` in a new tab. Readers add a title, link, optional confirmation number, day and time, notes, and a status of **To book**, **Booked**, or **Skip**. The hub groups those items into Day 1 … Day N from the trip dates (or flexible nights). **Timeline** is the numbered day list. **Week** lays the same days into a Sunday-start calendar: each column is Day 1 … N with the weekday and date, and bookings show as chips (with a time when one is set). Drag a chip onto a day, or choose a day on the chip. Items without a day stay in **Unscheduled**. Moving a booking only changes `dayIndex`; the time stays put. Guest drafts and signed-in trips store that field the same way.

**Paste booking details** only reads the text the reader pasted. It may fill a link, a confirmation-looking code, a clock time, and a day when that text names one of the trip dates. It does not open or scrape partner sites.

Reader auth is the existing Auth.js email/password + Google session. Trips do not add a second login.

## Auth

Guests on the itinerary hub see **Sign in** and **Create account**. Both go to `/login` with `callbackUrl` set to `/guides/plan-a-trip` (or `?trip=` when they were opening a saved trip). Create account adds `mode=signup`. After email, password, or Google sign-in, Auth.js sends them back to that URL. The draft is already in this browser, so the hub comes back with it.

A draft edited while signed out is not written to Firestore until the reader chooses **Save itinerary**. **Keep it on this device** leaves it in `localStorage`. A reader who was signed in the whole time auto-saves. The hub shows **Unsaved changes**, **Saving…**, or **Saved to your account**.

If Firebase env is missing, save returns **503** and the hub says the itinerary stays in this browser, with **Try saving again**. Signing out mid-edit keeps the hub open when this browser already has that trip; **Sign in** returns to it. A save that comes back **401** stops auto-save and shows the same sign-in actions.

`/account` **Trips** lists title, destination, and dates. **Open** loads `/guides/plan-a-trip?trip={id}` and restores the hub. **Rename** sends `{ title }` only. **Delete** removes that reader’s trip. An empty list points back to Plan a trip.

## Who can save

| Reader | Where the itinerary lives |
| --- | --- |
| Guest | `localStorage` draft in this browser (`fj.plan-a-trip.active.v1`) |
| Signed in | Firestore `users/{userId}/trips/{tripId}`, plus the same browser draft |

## Firestore

```
users/{userId}/trips/{tripId}
  title, destination, dateMode, startDate, endDate, month, nights
  adults, children, categories[], origin, tripType, rooms, car fields, unsure
  items: [{
    id, type, title, url, notes, status, sortOrder, updatedAt, laneKey?
    confirmation?   // optional code, letters, digits, and hyphens
    dayIndex?       // 1-based day. Missing or outside the trip = unscheduled
    time?           // optional HH:MM
  }]
  packingNotes // freeform packing list, up to 4000 characters
  checklist   // item ids with status "booked"
  createdAt, updatedAt
```

`userId` is Auth.js `session.user.id`. Item `type` is `flight | hotel | car | activity | note | other`. `status` is `todo | booked | skipped`. Day 1 is the trip start (inclusive through the end date, or the flexible check-in through checkout). The hub shows at most 45 days. Guest drafts store the same item fields in `localStorage`. **Copy itinerary link** puts the draft in the page hash (`#itinerary=`) so someone can open it without an account. **Packing notes** live on the same draft and on the Firestore trip.

## API

Session required (`session.user.id`). Trips live under that id, so one reader cannot read or change another’s. **401** when signed out. **503** when `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` is missing — the JSON `error` is a short human sentence, not the env var list. Create stops at 50 trips (**409**).

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/trips` | List the reader’s trips, newest first |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips/[id]` | Load one trip |
| PATCH | `/api/trips/[id]` | Replace trip fields, or `{ title }` to rename |
| DELETE | `/api/trips/[id]` | Remove a trip |

## Code map

- `src/lib/trip-record.ts` — types, validation, titles, login return URL
- `src/lib/trips.ts` — Firestore list / get / create / update / delete
- `src/app/api/trips/route.ts`, `src/app/api/trips/[id]/route.ts`
- `src/components/trip-planner/ItineraryHub.tsx` — lanes, Timeline | Week toggle, add/edit form, sign-in banner
- `src/components/trip-planner/WeekView.tsx` — week grid and unscheduled tray
- `src/components/trip-planner/useTripSync.ts` — guest draft, merge offer, account sync
- `src/components/account/MyTripsList.tsx` — account list
- `src/lib/trip-planner-storage.ts` — browser draft (and a backup if a saved trip is opened over it)

## Related

Saved stories use the same Firebase project — see [READER-SAVED-POSTS.md](./READER-SAVED-POSTS.md). Sign-in is documented in [READER-AUTH.md](./READER-AUTH.md).
