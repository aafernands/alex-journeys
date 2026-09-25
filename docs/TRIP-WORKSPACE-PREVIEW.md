# Trip workspace preview

Developed on `feat/trip-workspace-preview`; approved for integration into main.

Open the local preview at http://localhost:3107/guides/plan-a-trip.
To restart it, run `npm run dev -- --port 3107` on this branch.

## Review flow

1. Create a trip with a destination, dates, and travelers. Booking categories are optional.
2. Review the Overview tab, booking checklist, and next action.
3. Add an activity to a particular day. Edit it, then reload and confirm it remains saved.
4. Open Bookings, choose Add manually, type details, then change the booking type. The entered details remain intact.
5. Mark a reservation Booked. Confirm planned entries are not presented as bookings.
6. Open Import a booking. Guests see the existing sign-in requirement for email imports.
7. Try a narrow phone viewport, tab navigation, and Escape from the entry dialog.
8. Share a copy creates a snapshot; later edits do not update that shared copy. More options contains the confirmed start-new-trip action.

The UI retains the existing booking APIs, email receiving setup, guest drafts, account sync, and booking-return routes. Insurance/eSIM/experience searches remain in Bookings rather than becoming required checklist tasks.

## Validation

- New workspace unit tests: 3 passed.
- Full suite after incorporating the latest main: 206 passed, 0 failures.
- Full lint: 34 existing errors and 17 warnings. Modified/new planner code has no lint findings.
- Production build: passed.
- TypeScript check and `git diff --check` pass.
- Local browser checks passed for category-free creation, exact dates, day-specific activity entry, editing, reload persistence, type-change preservation, unmatched reservations, guest import entry, keyboard focus return, and 390px overflow.
- Account-backed saves, actual paid bookings, and inbound email delivery were not exercised; their integrations were preserved.
- Flights and Stay both expose Import confirmation under Keep every booking together. Browser checks confirmed both open the existing guest import panel with a sign-in callback to the planner. Stay search retains destination, dates, and travelers. Existing flight, stay, and authentication regression tests pass.
