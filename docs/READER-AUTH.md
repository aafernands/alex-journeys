# Reader email/password auth & CMS users

Public readers can sign in with **email + password** or **Google** at `/login`. Profiles live in **Cloud Firestore** (`users/{userId}`). CMS admins can list and disable users at `/cms/users`.

Reader sessions **never** unlock `/cms`. CMS still requires `CMS_ADMIN_EMAILS` (OAuth) and/or `CMS_PASSCODE`.

## What readers get

| Surface | Behavior |
| --- | --- |
| Header **Sign in** | Goes to `/login` (not direct Google) |
| `/login` | Sign in / Create account (name, email, password ≥ 8) + Continue with Google |
| `/account` | Dashboard for credentials and Google users; saved posts use `session.user.id` |
| Blog **Save** | Signed-out → `/login?callbackUrl=…` |

## Firestore `users` collection

Document id strategy (stable for `users/{id}/saved`):

| Provider | Document id |
| --- | --- |
| Google / GitHub | Auth.js `providerAccountId` (same as today — do not change) |
| Email/password only | `cred_` + first 40 hex of SHA-256(`email:` + lowercased email) |
| Email signup when Google profile already exists for that email | Credentials are **merged onto the existing OAuth doc** so saves stay unified |

Fields:

```
email, name, passwordHash | null, providers: ["google"|"github"|"credentials"],
image, createdAt, updatedAt, lastLoginAt, disabled
```

- Passwords are **bcrypt** hashes via `bcryptjs`. Never stored plaintext.
- `passwordHash` is **never** returned from CMS/list APIs or register responses.
- Google sign-in **upserts** the profile and **never clears** `passwordHash`.
- `disabled: true` → credentials `authorize` fails; Google `signIn` callback denies.

## Env vars

No new variables beyond what saved posts / Google already need:

| Variable | Notes |
| --- | --- |
| `AUTH_SECRET` | Required for all Auth.js |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google button on `/login` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Required for email/password + user profiles |
| `FIREBASE_FIRESTORE_DATABASE_ID` | Optional named DB |
| `CMS_ADMIN_EMAILS` / `CMS_PASSCODE` | CMS only (unchanged) |

Email/password is enabled when `AUTH_SECRET` **and** Firebase are set. Build still succeeds without them.

## CMS Users (`/cms/users`)

Admin-only (existing CMS auth gate):

- List: name, email, providers, created, last login, disabled
- **Disable / Enable** — blocks future credentials and Google sign-in
- **Delete** — removes the user **document** only (confirm in UI). `saved` subcollections may remain as Firestore orphans

APIs: `GET /api/cms/users`, `PATCH|DELETE /api/cms/users/[id]`.

## Code map

- `src/lib/users.ts` — register, authorize, upsert OAuth, list, disable, delete
- `src/auth.ts` — Credentials + Google + GitHub; `pages.signIn = /login`
- `src/app/login/page.tsx`, `src/components/ReaderLoginForm.tsx`
- `src/app/api/auth/register/route.ts`
- `src/app/cms/users/page.tsx`, `src/components/cms/UsersList.tsx`
- `src/app/api/cms/users/` — CMS user management

## Out of scope (follow-ups)

- Email verification
- Magic links
- Password reset / change
- Merging two separate accounts that already have different doc ids and save trees

## How to test

1. With Firebase + `AUTH_SECRET` set locally or on Vercel, open `/login`.
2. **Create account** → land on `/account` → save a post from a blog page → confirm it lists under Saved.
3. Sign out → **Sign in** with the same email/password.
4. **Continue with Google** (if configured) → profile appears; saves use Google `sub` id as before.
5. As CMS admin, open `/cms/users` → disable the test user → credentials and Google sign-in for that account should fail → re-enable.
