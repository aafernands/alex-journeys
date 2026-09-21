# X (Twitter) reader sign-in — Fernandes Journeys

Checklist for Alex. **Continue with X** on `/login` appears only when both env vars below are set. X is a public reader sign-in, same idea as Google: save stories and trip plans. It does **not** unlock `/cms`, and it is **not** on the CMS login screen.

GitHub stays the admin-oriented OAuth provider. An X session never sets admin, even if a name or email matches `CMS_ADMIN_EMAILS`.

## Vercel env

Set these on **Production** (and Preview only if you also register that preview callback in the X portal). Redeploy after saving. Never commit the values.

| Variable | Value |
| --- | --- |
| `AUTH_TWITTER_ID` | OAuth **2.0 Client ID** from the X app |
| `AUTH_TWITTER_SECRET` | OAuth **2.0 Client Secret** from the X app |
| `AUTH_SECRET` | Already required for Auth.js. X does nothing without it. |

Use the OAuth 2.0 client pair. The older **API Key** and **API Key Secret** are OAuth 1.0a and will not work with this app’s Auth.js Twitter provider (it calls `https://x.com/i/oauth2/authorize` and `https://api.x.com/2/oauth2/token`).

`npm run build` succeeds when these are unset. The X button stays hidden until both are present.

## X Developer Portal

1. Open [developer.x.com](https://developer.x.com/) → your project → the app used for Fernandes Journeys (or create one).
2. **User authentication settings** → Set up / Edit.
3. App permissions: **Read** is enough. This site asks only for `users.read` and `offline.access` (name, profile photo, and a refresh token). It does not request `tweet.read` and does not post.
4. Type of app: **Web App, Automated App or Bot** (confidential client, so you get a client secret).
5. Callback / Redirect URIs — add each exact URL:

   | Where | Callback |
   | --- | --- |
   | Production (apex, required) | `https://fernandesjourneys.com/api/auth/callback/twitter` |
   | Production (www — live site and the Google callback use www) | `https://www.fernandesjourneys.com/api/auth/callback/twitter` |
   | Local | `http://localhost:3000/api/auth/callback/twitter` |

   Auth.js builds the callback from the host the browser is on, so both apex and www need to be listed if both hosts can reach `/login`.

   Google’s branding doc in this repo does **not** list Vercel preview callbacks. X will not accept a wildcard. To try X on a preview deployment, add that deployment’s exact URL too:

   `https://<preview-host>.vercel.app/api/auth/callback/twitter`

6. Website URL: `https://www.fernandesjourneys.com`
7. Optional but useful on the app settings: privacy `https://www.fernandesjourneys.com/privacy`, terms `https://www.fernandesjourneys.com/terms`.
8. Save, then copy **OAuth 2.0 Client ID** and **Client Secret** into the Vercel vars above.
9. Redeploy Production.

## What readers get (and don’t)

- Button label: **Continue with X**, next to **Continue with Google** when that is configured. Same disabled and “Redirecting…” behavior.
- Firestore doc id is the X user id (`account.providerAccountId`). Provider stored as `twitter`.
- Disabled users are rejected the same way as Google.
- X OAuth 2 usually does **not** return an email. Those accounts are separate from Google and email/password accounts. Forgot-password cannot look them up unless an email was added later on `/account`.
- Profile photo comes from X (`pbs.twimg.com`) until the reader sets their own.

## Quick check after deploy

1. `/login` shows **Continue with X** only after the Production redeploy with both env vars.
2. Sign in with X → land on `/account` (or the `callbackUrl` you started from). Saved stories use that X user id.
3. The header menu must **not** show the admin console for that session.
4. `/cms` still asks for Google, GitHub, or the passcode — no X button.
5. In `/cms/users`, disable the X user → the next X sign-in is denied → enable again.
