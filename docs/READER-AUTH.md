# Reader email/password auth & CMS users

Public readers can sign in with **email + password**, **Google**, or **X** at `/login`. Profiles live in **Cloud Firestore** (`users/{userId}`). CMS admins can list and disable users at `/cms/users`.

Reader sessions **never** unlock `/cms`. CMS still requires `CMS_ADMIN_EMAILS` (Google or GitHub) and/or `CMS_PASSCODE`. **X never grants CMS admin**, even if an email on the profile is allowlisted. X setup: [X-SIGN-IN.md](./X-SIGN-IN.md).

## What readers get

| Surface | Behavior |
| --- | --- |
| Header **Sign in** | Goes to `/login` (not direct Google). On a phone it is only in the menu, as a full-width **Sign in / Create account**. The sticky bar keeps search and the menu. |
| `/login` | Sign in / Create account (name, email, password ≥ 8) + Continue with Google + Continue with X (when configured) + **Forgot password?** |
| `/forgot-password` | Request a time-limited reset email (Resend) |
| `/reset-password?token=…` | Set a new password, then sign in |
| `/account` | Dashboard; **Profile settings** (name, photo, email change) + **Change password** for credentials users |
| `/account/confirm-email?token=…` | Confirm a pending email change |
| Blog **Save** | Signed-out → `/login?callbackUrl=…` |

## Firestore `users` collection

Document id strategy (stable for `users/{id}/saved`):

| Provider | Document id |
| --- | --- |
| Google / X / GitHub | Auth.js `providerAccountId` (same as today — do not change). X stores provider id `twitter`. |
| Email/password only | `cred_` + first 40 hex of SHA-256(`email:` + lowercased email) |
| Email signup when Google profile already exists for that email | Credentials are **merged onto the existing OAuth doc** so saves stay unified |

Fields:

```
email, name, passwordHash | null, providers: ["google"|"twitter"|"github"|"credentials"],
image, createdAt, updatedAt, lastLoginAt, disabled,
emailManagedLocally, nameManagedLocally, imageManagedLocally
```

- Passwords are **bcrypt** hashes via `bcryptjs`. Never stored plaintext.
- `passwordHash` is **never** returned from CMS/list APIs or register responses.
- Google and X sign-in **upsert** the profile and **never clear** `passwordHash`.
- X uses the same disabled check as Google. An X session does **not** set `isAdmin`.
- X’s OAuth 2 user lookup usually has **no email**, so an X account stays its own Firestore doc (it does not merge onto a Google or email account).
- When `emailManagedLocally` / `nameManagedLocally` / `imageManagedLocally` is true, OAuth upsert **does not overwrite** that field (so a verified email change or custom name/photo sticks).
- **Changing email never recreates the Firestore doc id** (saved posts stay under the same `users/{id}`).
- `disabled: true` → credentials `authorize` fails; Google and X `signIn` callbacks deny.

## Password reset tokens

**Choice:** separate collection `passwordResetTokens/{tokenHash}` (not embedded on the user doc).

| Field | Notes |
| --- | --- |
| Doc id / `tokenHash` | SHA-256 hex of the **raw** URL token (raw token is never stored) |
| `userId` | Firestore user id |
| `email` | Normalized email at request time |
| `expiresAt` | ISO timestamp (~1 hour from creation) |
| `usedAt` | `null` until consumed; set on successful reset |
| `createdAt` | ISO timestamp |

Raw token: 32 bytes `crypto.randomBytes` → URL-safe `base64url`.  
Reset link: `{AUTH_URL \|\| https://www.alexjourneys.com}/reset-password?token={raw}`.

On successful reset: `passwordHash` updated (bcrypt), token marked `usedAt`, and other outstanding tokens for that `userId` are invalidated.

### Flow

1. `POST /api/auth/forgot-password` `{ email }`
2. Email with time-limited link (Resend)
3. `/reset-password?token=…` → `POST /api/auth/reset-password` `{ token, password }` → sign in at `/login`

### Responses (anti-enumeration + Google-only)

| Case | Response |
| --- | --- |
| `RESEND_API_KEY` missing | **503** — clear message that reset email isn’t configured (build still succeeds) |
| Unknown / disabled email | **200** generic success (same wording whether or not the email exists) |
| User exists but **no** `passwordHash` (Google-only, X-only, or both) | **400** — tell them to use **Continue with Google** and/or **Continue with X**; do **not** claim an email was sent |
| Credentials user + Resend OK | Send email → **200** same generic success message |
| Resend returns non-2xx | **502** — `{ error }` is Resend’s `message` (prefixed), e.g. testing-only recipient restriction |

Generic success copy:

> If an account with that email exists and can reset a password, you will receive a reset link shortly.

### Change password (signed-in)

Credentials users on `/account` can change password via `POST /api/auth/change-password` `{ currentPassword, newPassword }` (session required). Outstanding reset tokens for that user are invalidated.

## Email change (verified)

**Collection:** `emailChangeTokens/{tokenHash}` (same hashing pattern as password reset).

| Field | Notes |
| --- | --- |
| Doc id / `tokenHash` | SHA-256 hex of the **raw** URL token |
| `userId` | Firestore user id (**unchanged** when email updates) |
| `newEmail` / `oldEmail` | Normalized |
| `expiresAt` | ~1 hour |
| `usedAt` | `null` until confirmed or cancelled |
| `createdAt` | ISO timestamp |

### Flow

1. Signed-in user on `/account` → **Profile settings** → new email (+ current password if credentials).
2. `POST /api/auth/change-email/request` validates format, rejects same-as-current, rejects taken emails (`Email already in use.`), creates token (invalidates prior pending for that user).
3. Resend emails the **new** address a link: `{AUTH_URL}/account/confirm-email?token=…`.
4. Best-effort notify the **old** address (“a request was made…”).
5. `/account/confirm-email` → `POST /api/auth/change-email/confirm` → updates `users/{id}.email`, sets `emailManagedLocally: true`, consumes token.
6. Client calls Auth.js `session.update({ email })` so the JWT/session shows the new address without a full re-login (fallback: sign out/in).

Optional: `POST /api/auth/change-email/cancel` clears pending tokens for the signed-in user.

**Admin note:** CMS admin matching uses `CMS_ADMIN_EMAILS`. Changing away from an allowlisted address removes admin until the allowlist is updated (help text on `/account`).

## Profile name + photo

`PATCH /api/account/profile` (session required):

- JSON `{ name?, image? | imageUrl?, clearImage? }` or multipart (`name`, `file`, `imageUrl`, `clearImage`).
- Photo: https URL, or small JPEG/PNG/WebP upload stored as a data URL on the user doc (max ~400KB). Firebase Storage is not required.
- Sets `nameManagedLocally` / `imageManagedLocally` so Google and X login keep custom values.
- Client refreshes session via `useSession().update({ name, image })`.

## Env vars

| Variable | Notes |
| --- | --- |
| `AUTH_SECRET` | Required for all Auth.js |
| `AUTH_URL` | Production: `https://www.alexjourneys.com` (no path). Used for reset links and for the OAuth callback host. A wrong host (apex vs www) drops the X session after Authorize. Details: [X-SIGN-IN.md](./X-SIGN-IN.md). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google button on `/login` |
| `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` | **Continue with X** on `/login` when both are set. OAuth 2.0 Client ID + Client Secret (not the OAuth 1.0 API key). Does not unlock CMS. `GET /2/users/me` needs `tweet.read` (a 403 is not a bad secret). A missing state cookie is `InvalidCheck`. Full checklist: [X-SIGN-IN.md](./X-SIGN-IN.md). |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Required for email/password + user profiles + reset tokens |
| `FIREBASE_FIRESTORE_DATABASE_ID` | Optional named DB |
| `RESEND_API_KEY` | **Required to send** reset + email-change emails via Resend HTTP API. The same key reads inbound booking mail when it has full access. See [TRIPS-INBOUND.md](./TRIPS-INBOUND.md). |
| `RESEND_WEBHOOK_SECRET` | Signing secret for `POST /api/inbound/email` (`email.received`). |
| `INBOUND_EMAIL_DOMAIN` | Optional. Default `inbound.alexjourneys.com`. |
| `INBOUND_SAMPLE_SECRET` | Optional. Unlocks the inbound sample harness. |
| `EMAIL_FROM` | Optional. Default for testing: `Alex Journeys <onboarding@resend.dev>` (Resend’s shared sender). With that default, Resend **only sends to the Resend account owner email** until you verify a domain and set `EMAIL_FROM` to an address on it (e.g. `Alex Journeys <contact@alexjourneys.com>`). |
| `CMS_ADMIN_EMAILS` / `CMS_PASSCODE` | CMS only (unchanged). Admin matching is by email string — after an email change, update the allowlist if needed. |

Email/password is enabled when `AUTH_SECRET` **and** Firebase are set. Build still succeeds without them (and without Resend).

## CMS Users (`/cms/users`)

Admin-only (existing CMS auth gate):

- List: name, email, providers, created, last login, disabled
- **Send reset link** — emails the same 1-hour reset URL as self-serve forgot-password (Resend). Works for Google-only users too (link *sets* a password). Disabled users / missing email → clear error. Token is never returned in the API response.
- **Disable / Enable** — blocks future credentials, Google, and X sign-in
- **Delete** — removes the user **document** only (confirm in UI). `saved` subcollections may remain as Firestore orphans

APIs: `GET /api/cms/users`, `PATCH|DELETE /api/cms/users/[id]`, `POST /api/cms/users/[id]/send-reset`.

## Code map

- `src/lib/users.ts` — register, authorize, upsert OAuth, list, disable, delete, **password reset / change**, **email-change tokens**, **profile update**
- `src/lib/email.ts` — Resend HTTP send + `publicSiteOrigin()`
- `src/auth.ts` — Credentials + Google + X (Twitter) + GitHub; JWT `trigger: "update"` for live session name/email/image. X never sets `isAdmin`.
- `src/lib/auth-config.ts` — `isTwitterAuthConfigured`, `isReaderAuthConfigured`, `grantsCmsAdmin` (re-exported from `src/auth.ts`)
- `src/app/login/page.tsx`, `src/components/ReaderLoginForm.tsx`
- `src/app/forgot-password/`, `src/app/reset-password/`
- `src/app/account/`, `src/app/account/confirm-email/`
- `src/components/ProfileSettingsForm.tsx`, `src/components/ConfirmEmailClient.tsx`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/change-password/route.ts`
- `src/app/api/auth/change-email/{request,confirm,cancel}/route.ts`
- `src/app/api/account/profile/route.ts`
- `src/app/cms/users/page.tsx`, `src/components/cms/UsersList.tsx`
- `src/app/api/cms/users/` — CMS user management (incl. `…/[id]/send-reset`)

## Out of scope (follow-ups)

- Signup email verification (separate from change-email)
- Magic links
- Firebase Storage for profile photos (data URL / https URL for now)
- Merging two separate accounts that already have different doc ids and save trees

## How to test

### Sign-up / sign-in

1. With Firebase + `AUTH_SECRET` set locally or on Vercel, open `/login`.
2. **Create account** → land on `/account` → save a post from a blog page → confirm it lists under Saved.
3. Sign out → **Sign in** with the same email/password.
4. **Continue with Google** (if configured) → profile appears; saves use Google `sub` id as before.
5. **Continue with X** (if `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` are set) → profile appears under the X user id. That session must **not** show Admin console, even if you also have a Google admin email.
6. As CMS admin, open `/cms/users` → disable the test user → credentials, Google, and X sign-in for that account should fail → re-enable.

### Password reset

1. Set `RESEND_API_KEY` (and optionally `EMAIL_FROM`, `AUTH_URL`) on the deployment.
2. With a credentials account, open `/login` → **Forgot password?** → submit email.
   - **Testing sender:** until a domain is verified, default `onboarding@resend.dev` only delivers to the email on your Resend account. Other recipients get a **502** whose UI text includes Resend’s “You can only send testing emails…” message.
3. Check the inbox (Resend dashboard / email) for the link → open `/reset-password?token=…` → set a new password → sign in.
4. Submit a **Google-only** email on forgot-password → expect a message to use Google (no “email sent” claim). An **X-only** account that has an email on file should be told to use **Continue with X**. X often does not share an email, so forgot-password cannot find those accounts by address.
5. With `RESEND_API_KEY` unset → forgot-password returns a clear 503-style error; site still builds.
6. Signed-in credentials user: `/account` → **Change password** with current + new.
7. As CMS admin on `/cms/users` → **Send reset link** for a user with an email → expect success “Reset email sent to …” and the same Resend inbox / dashboard delivery as forgot-password. Try a Google-only user (no password yet) → link should still arrive and allow setting a password. Disabled / no-email rows should refuse clearly.

### Email change + profile

1. **Credentials:** sign in → `/account` → Profile settings → change name/photo → confirm header updates. Request email change with current password → check **new** inbox for confirm link (+ optional notify on old) → open `/account/confirm-email?token=…` → session email updates; Firestore doc id unchanged; saved posts still list.
2. **Google-only:** same flow without password; after confirm, `emailManagedLocally` is set — sign out, Continue with Google, email should **not** revert to the Google address.
3. Taken email → “Email already in use.” Same-as-current → clear validation error. Cancel pending from `/account`.
4. Without `RESEND_API_KEY` → request returns clear 503; profile name/photo still work.
