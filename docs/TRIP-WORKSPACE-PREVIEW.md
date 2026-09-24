# Trip workspace preview

Branch: `feat/trip-workspace-preview`. No changes have been merged or deployed to main.

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
- Full suite: 205 passed, 1 existing failure in `scripts/header-chrome.test.mjs` (expects `md:h-20` in the unchanged Header).
- Full lint: 34 existing errors and 17 warnings. Modified/new planner code has no lint findings.
- Production build: passed.
- TypeScript check and `git diff --check` pass.
- Local browser checks passed for category-free creation, exact dates, day-specific activity entry, editing, reload persistence, type-change preservation, unmatched reservations, guest import entry, keyboard focus return, and 390px overflow.
- Account-backed saves, actual paid bookings, and inbound email delivery were not exercised; their integrations were preserved.
