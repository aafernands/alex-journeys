# Reader Google login & saved posts

Public readers can **Sign in** (email/password or Google — see [READER-AUTH.md](./READER-AUTH.md)) and **Save** blog posts. Saved posts live on the **Account** dashboard (`/account`). Data is stored in **Cloud Firestore** on the existing Firebase project. CMS admin access is unchanged: allowlisted `CMS_ADMIN_EMAILS` or passcode only.

## What readers get

| Surface | Behavior |
| --- | --- |
| Header | Signed out: **Sign in** → `/login` on desktop, and in the sticky mobile bar beside the menu. The mobile menu leads with a full-width **Sign in**. Signed in: avatar menu (photo + name on desktop, photo in the mobile bar and an account row in the menu) → Account dashboard, Logout; admins also see **Admin console** → `/cms`. The bottom tab bar stays Places / Stories / Guides / Saved. |
| Blog post | **Save** / **Saved** toggle; signed-out tap → `/login` |
| `/account` | Reader dashboard: Google profile, saved posts (with Remove / Clear all), explore links, sign out |
| `/saved` | Permanent redirect → `/account` (saves are Account-only) |

Reader sessions **do not** unlock `/cms`.

## Firestore shape

```
users/{userId}/saved/{slug}
  { slug, title, savedAt, href }
```

`userId` = Auth.js `session.user.id` (Google `sub`).

## Env vars (Vercel + local `.env.local`)

| Variable | Required | Notes |
| --- | --- | --- |
| `FIREBASE_PROJECT_ID` | Yes for save | Firebase project id |
| `FIREBASE_CLIENT_EMAIL` | Yes for save | Service account email |
| `FIREBASE_PRIVATE_KEY` | Yes for save | Full private key; store with `\n` for newlines (code expands them) |
| `FIREBASE_PRIVATE_KEY_ID` | Optional | From the service account JSON (not required by the Admin SDK init) |

Also required for Google readers (already used by CMS):

- `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- Optional: `AUTH_TRUST_HOST=true` on Vercel

Build succeeds **without** Firebase env: save APIs return **503** until configured.

## Firebase console steps

1. Open [Firebase Console](https://console.firebase.google.com/) → your existing project.
2. **Build → Firestore Database** → create database (production mode is fine; rules can deny client access — this app uses the Admin SDK only).
3. **Project settings → Service accounts → Generate new private key** (or reuse an existing server key).
4. Copy into Vercel env:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep quotes/`\n` as Vercel expects)
5. Redeploy.

No client Firebase SDK is used; do not put the service account key in the browser.

## Google OAuth Testing mode

If the Google Cloud OAuth consent screen is in **Testing**, only listed test users can sign in as public readers. To open readers to everyone:

- Add test users in Google Cloud Console, **or**
- Publish the OAuth consent screen (External → In production).

Until then, non-test Google accounts will fail sign-in even though the site UI shows **Sign in**.

## Code map

- `src/lib/firebase-admin.ts` — Admin init
- `src/lib/saved-posts.ts` — list / add / remove
- `src/app/api/saved/route.ts` — GET / POST / DELETE
- `src/components/ReaderAuthButtons.tsx`, `UserMenu.tsx`, `SavePostButton.tsx`, `AccountAuthActions.tsx`, `SavedPostsList.tsx`
- `src/app/account/page.tsx` — reader dashboard (profile + saves + explore)
- `src/auth.ts` — Google open to all; `session.user.id` + `isAdmin` for CMS

## Named Firestore database (AI Studio)

If Firebase Console shows a database id other than `(default)` (e.g. `ai-studio-…`), set:

`FIREBASE_FIRESTORE_DATABASE_ID=<that-exact-id>`

Leave unset to use `(default)`.

## Related

Post **comments** (moderated) also use this Firestore project — see [COMMENTS.md](./COMMENTS.md).

Saved **trip itineraries** use `users/{userId}/trips` — see [TRIPS.md](./TRIPS.md).
