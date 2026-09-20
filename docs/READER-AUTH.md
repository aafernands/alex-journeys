# Reader email/password auth & CMS users

Public readers can sign in with **email + password** or **Google** at `/login`. Profiles live in **Cloud Firestore** (`users/{userId}`). CMS admins can list and disable users at `/cms/users`.

Reader sessions **never** unlock `/cms`. CMS still requires `CMS_ADMIN_EMAILS` (OAuth) and/or `CMS_PASSCODE`.

## What readers get

| Surface | Behavior |
| --- | --- |
| Header **Sign in** | Goes to `/login` (not direct Google) |
| `/login` | Sign in / Create account (name, email, password ≥ 8) + Continue with Google + **Forgot password?** |
| `/forgot-password` | Request a time-limited reset email (Resend) |
| `/reset-password?token=…` | Set a new password, then sign in |
| `/account` | Dashboard; credentials users also get **Change password** |
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
Reset link: `{AUTH_URL \|\| https://www.fernandesjourneys.com}/reset-password?token={raw}`.

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
| User exists but **no** `passwordHash` (Google-only) | **400** — tell them to use **Continue with Google**; do **not** claim an email was sent |
| Credentials user + Resend OK | Send email → **200** same generic success message |
| Resend returns non-2xx | **502** — `{ error }` is Resend’s `message` (prefixed), e.g. testing-only recipient restriction |

Generic success copy:

> If an account with that email exists and can reset a password, you will receive a reset link shortly.

### Change password (signed-in)

Credentials users on `/account` can change password via `POST /api/auth/change-password` `{ currentPassword, newPassword }` (session required). Outstanding reset tokens for that user are invalidated.

## Env vars

| Variable | Notes |
| --- | --- |
| `AUTH_SECRET` | Required for all Auth.js |
| `AUTH_URL` | Optional canonical site URL for reset links (e.g. `https://www.fernandesjourneys.com`). Falls back to `NEXTAUTH_URL`, then the production domain. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google button on `/login` |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Required for email/password + user profiles + reset tokens |
| `FIREBASE_FIRESTORE_DATABASE_ID` | Optional named DB |
| `RESEND_API_KEY` | **Required to send** reset emails via Resend HTTP API |
| `EMAIL_FROM` | Optional. Default for testing: `Fernandes Journeys <onboarding@resend.dev>` (Resend’s shared sender). With that default, Resend **only sends to the Resend account owner email** until you verify a domain and set `EMAIL_FROM` to an address on it (e.g. `Fernandes Journeys <hello@fernandesjourneys.com>`). |
| `CMS_ADMIN_EMAILS` / `CMS_PASSCODE` | CMS only (unchanged) |

Email/password is enabled when `AUTH_SECRET` **and** Firebase are set. Build still succeeds without them (and without Resend).

## CMS Users (`/cms/users`)

Admin-only (existing CMS auth gate):

- List: name, email, providers, created, last login, disabled
- **Send reset link** — emails the same 1-hour reset URL as self-serve forgot-password (Resend). Works for Google-only users too (link *sets* a password). Disabled users / missing email → clear error. Token is never returned in the API response.
- **Disable / Enable** — blocks future credentials and Google sign-in
- **Delete** — removes the user **document** only (confirm in UI). `saved` subcollections may remain as Firestore orphans

APIs: `GET /api/cms/users`, `PATCH|DELETE /api/cms/users/[id]`, `POST /api/cms/users/[id]/send-reset`.

## Code map

- `src/lib/users.ts` — register, authorize, upsert OAuth, list, disable, delete, **password reset / change helpers**
- `src/lib/email.ts` — Resend HTTP send + `publicSiteOrigin()`
- `src/auth.ts` — Credentials + Google + GitHub; `pages.signIn = /login`
- `src/app/login/page.tsx`, `src/components/ReaderLoginForm.tsx`
- `src/app/forgot-password/`, `src/app/reset-password/`
- `src/app/api/auth/register/route.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/api/auth/change-password/route.ts`
- `src/app/cms/users/page.tsx`, `src/components/cms/UsersList.tsx`
- `src/app/api/cms/users/` — CMS user management (incl. `…/[id]/send-reset`)

## Out of scope (follow-ups)

- Email verification
- Magic links
- Merging two separate accounts that already have different doc ids and save trees

## How to test

### Sign-up / sign-in

1. With Firebase + `AUTH_SECRET` set locally or on Vercel, open `/login`.
2. **Create account** → land on `/account` → save a post from a blog page → confirm it lists under Saved.
3. Sign out → **Sign in** with the same email/password.
4. **Continue with Google** (if configured) → profile appears; saves use Google `sub` id as before.
5. As CMS admin, open `/cms/users` → disable the test user → credentials and Google sign-in for that account should fail → re-enable.

### Password reset

1. Set `RESEND_API_KEY` (and optionally `EMAIL_FROM`, `AUTH_URL`) on the deployment.
2. With a credentials account, open `/login` → **Forgot password?** → submit email.
   - **Testing sender:** until a domain is verified, default `onboarding@resend.dev` only delivers to the email on your Resend account. Other recipients get a **502** whose UI text includes Resend’s “You can only send testing emails…” message.
3. Check the inbox (Resend dashboard / email) for the link → open `/reset-password?token=…` → set a new password → sign in.
4. Submit a **Google-only** email on forgot-password → expect a message to use Google (no “email sent” claim).
5. With `RESEND_API_KEY` unset → forgot-password returns a clear 503-style error; site still builds.
6. Signed-in credentials user: `/account` → **Change password** with current + new.
7. As CMS admin on `/cms/users` → **Send reset link** for a user with an email → expect success “Reset email sent to …” and the same Resend inbox / dashboard delivery as forgot-password. Try a Google-only user (no password yet) → link should still arrive and allow setting a password. Disabled / no-email rows should refuse clearly.
