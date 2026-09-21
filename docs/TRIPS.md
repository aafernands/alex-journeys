# Saved trips

Plan a trip (`/guides/plan-a-trip`) ends on an **itinerary hub**: one booking lane per selected partner (flights, stay, car, and extras), each with a partner search that opens through `/out` in a new tab. Readers paste a link, title, and notes after they search, and mark each item **To book**, **Booked**, or **Skip**.

Reader auth is the existing Auth.js email/password + Google session. Trips do not add a second login.

## Who can save

| Reader | Where the itinerary lives |
| --- | --- |
| Guest | `localStorage` draft in this browser (`fj.plan-a-trip.active.v1`) |
| Signed in | Firestore `users/{userId}/trips/{tripId}`, plus the same browser draft |

Guests see **Sign in to save this itinerary**, which returns to `/guides/plan-a-trip` (or `?trip=` when they were opening a saved trip). After login, a draft that already has a destination is offered as **Save itinerary** / **Keep it on this device**. A reader who was signed in the whole time auto-saves when they reach the hub.

`/account` lists **My trips** (title, destination, dates). **Open** loads that trip’s hub.

## Firestore

```
users/{userId}/trips/{tripId}
  title, destination, dateMode, startDate, endDate, month, nights
  adults, children, categories[], origin, tripType, rooms, car fields, unsure
  items: [{ id, type, title, url, notes, status, sortOrder, updatedAt, laneKey? }]
  checklist   // item ids with status "booked"
  createdAt, updatedAt
```

`userId` is Auth.js `session.user.id`. Item `type` is `flight | hotel | car | activity | note | other`. `status` is `todo | booked | skipped`.

## API

Session required. **503** when `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` is missing (same as saved posts).

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/api/trips` | List the reader’s trips, newest first |
| POST | `/api/trips` | Create a trip |
| GET | `/api/trips/[id]` | Load one trip |
| PATCH | `/api/trips/[id]` | Replace trip fields |
| DELETE | `/api/trips/[id]` | Remove a trip |

## Code map

- `src/lib/trip-record.ts` — types, validation, titles, login return URL
- `src/lib/trips.ts` — Firestore list / get / create / update / delete
- `src/app/api/trips/route.ts`, `src/app/api/trips/[id]/route.ts`
- `src/components/trip-planner/ItineraryHub.tsx` — lanes, items, sign-in banner
- `src/components/trip-planner/useTripSync.ts` — guest draft, merge offer, account sync
- `src/components/account/MyTripsList.tsx` — account list
- `src/lib/trip-planner-storage.ts` — browser draft (and a backup if a saved trip is opened over it)

## Related

Saved stories use the same Firebase project — see [READER-SAVED-POSTS.md](./READER-SAVED-POSTS.md). Sign-in is documented in [READER-AUTH.md](./READER-AUTH.md).
