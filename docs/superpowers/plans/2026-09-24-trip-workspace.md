# Trip workspace implementation plan

**Goal:** Implement the approved in-chat proposal on `feat/trip-workspace-preview` for local review before any main deployment.

**Design:** One setup form, Overview / Itinerary / Bookings navigation, one next action, visible save state, snapshot sharing, guarded reset, and mobile-friendly editing. Preserve current brand, API contracts, booking integrations, and stored trips.

**Execution:** Inline using executing-plans and test-driven development.

- [x] Add tested workspace helpers for setup validation and honest booking progress (mixed planned/booked/skipped items).
- [x] Collapse legacy setup steps into one form while accepting existing step 1/2/3 drafts and retaining step 4 for completed plans.
- [x] Reorganize the existing itinerary hub into accessible workspace views. Retain return-to-booking hashes, imports, and save recovery. Add day-specific quick entry and guard starting over.
- [x] Apply responsive styles using existing tokens; keep secondary tools out of the primary task area.
- [x] Run tests, build, and lint comparison. Exercise guest creation, editing, sharing, and return navigation; provide local preview. Do not push, merge, or deploy main.

Review focus: category-free trips, legacy drafts, empty trips, mixed booking states, flexible dates, signed-out save states, booking-return hashes, keyboard navigation, and mobile overflow.

## Execution notes

- Kept the user-requested separate branch in the existing checkout, leaving main unchanged.
- Preserved storage schemas and steps 1/2/3 as setup-compatible legacy drafts; step 4 remains the itinerary.
- Local browser checks cover category-free creation, exact dates, adding/editing day-specific activity, reload persistence, booking type changes without losing entered data, unmatched bookings, import sign-in entry, mobile overflow, and dialog focus return.
- Independent review identified booking-type remount and dialog focus restoration issues; both corrected and re-reviewed.
- Full tests: 205 passed / 1 existing unrelated header-chrome failure. New workspace tests: 3 passed. Full lint: 34 errors / 17 warnings in existing code; no findings in modified/new planner code.
