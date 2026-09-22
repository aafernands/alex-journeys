# X (Twitter) reader sign-in — Fernandes Journeys

Checklist for Alex. **Continue with X** on `/login` appears only when both env vars below are set. X is a public reader sign-in, same idea as Google: save stories and trip plans. It does **not** unlock `/cms`, and it is **not** on the CMS login screen.

GitHub stays the admin-oriented OAuth provider. An X session never sets admin, even if a name or email matches `CMS_ADMIN_EMAILS`.

## Vercel env

Set these on **Production** (and Preview only if you also register that preview callback in the X portal). Redeploy after saving. Never commit the values.

| Variable | Value |
| --- | --- |
| `AUTH_TWITTER_ID` | OAuth **2.0 Client ID** from the X app |
| `AUTH_TWITTER_SECRET` | OAuth **2.0 Client Secret** from the X app. Must be the **current** secret. Regenerating it in the portal invalidates the old value; paste the new one here and redeploy. |
| `AUTH_SECRET` | Already required for Auth.js. X does nothing without it. |
| `AUTH_URL` | **Set on Production** to `https://www.fernandesjourneys.com` (no path, no trailing slash). See below. |

Use the OAuth 2.0 client pair. The older **API Key** and **API Key Secret** are OAuth 1.0a and will not work with this app’s Auth.js Twitter provider (it calls `https://x.com/i/oauth2/authorize` and `https://api.x.com/2/oauth2/token`).

`npm run build` succeeds when the Twitter pair is unset. The X button stays hidden until both are present.

### `AUTH_URL` (www, not apex)

Auth.js builds the OAuth `redirect_uri` from `AUTH_URL` when that variable is set. When it is unset, it uses the request host (`trustHost` is already on in code). Production readers and the callback this app advertises are on **www**:

`https://www.fernandesjourneys.com/api/auth/callback/twitter`

Set Production `AUTH_URL` to `https://www.fernandesjourneys.com`.

If `AUTH_URL` is the apex (`https://fernandesjourneys.com`) while the browser is on www, Auth.js sends X a callback on a different host than the one that stored the PKCE and state cookies. After Authorize, those cookies are not sent, the token exchange fails, and the reader lands on `/login` with no session.

Do not put a path on `AUTH_URL`. `AUTH_TRUST_HOST=true` does not replace a wrong `AUTH_URL`; a set `AUTH_URL` wins.

## X Developer Portal

1. Open [developer.x.com](https://developer.x.com/) → your project → the app used for Fernandes Journeys (or create one).
2. **User authentication settings** → Set up / Edit.
3. App permissions: **Read** is enough. This site asks only for `users.read` and `offline.access` (name, profile photo, and a refresh token). It does not request `tweet.read` and does not post.
4. Type of app: **Web App, Automated App or Bot** (confidential client, so you get a client secret).
5. Callback / Redirect URIs — add each exact URL. The one Auth.js uses in production is the **www** row. X compares it character for character (scheme, host, path).

   | Where | Callback |
   | --- | --- |
   | Production (required — this is the callback Auth.js advertises) | `https://www.fernandesjourneys.com/api/auth/callback/twitter` |
   | Production apex, only if that host can open `/login` without redirecting to www first | `https://fernandesjourneys.com/api/auth/callback/twitter` |
   | Local | `http://localhost:3000/api/auth/callback/twitter` |

   Google’s branding doc in this repo does **not** list Vercel preview callbacks. X will not accept a wildcard. To try X on a preview deployment, add that deployment’s exact URL too:

   `https://<preview-host>.vercel.app/api/auth/callback/twitter`

6. Website URL: `https://www.fernandesjourneys.com`
7. Optional but useful on the app settings: privacy `https://www.fernandesjourneys.com/privacy`, terms `https://www.fernandesjourneys.com/terms`.
8. Save, then copy **OAuth 2.0 Client ID** and **Client Secret** into the Vercel vars above. If the portal only shows the secret once, or you regenerate it, update `AUTH_TWITTER_SECRET` to that new value. The OAuth 1.0 API Key Secret will not work here.
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

## After Authorize, back on `/login` with no session

Auth.js sends the failure to `/login?error=CODE` (the sign-in page and the error page are both `/login`). The form names that code. Google still working only tells you Auth.js and `AUTH_SECRET` are up; X has its own client, secret, and callback.

A healthy authorize URL (www `redirect_uri`, scope `users.read offline.access`, `client_id` present) only proves the **browser** step. X then requires `client_id` on the **token POST**. Auth.js’s default Basic header does not send that field, and the thrown token error is reported as `Configuration`. This app sends the Client ID and Client Secret in the token body (`client_secret_post`). If `Configuration` remains after this deploy, the Vercel secret still does not match the X portal.

| `error` | What it means | What to check |
| --- | --- | --- |
| `Configuration` | The token exchange (or another server-side step) threw. Auth.js hides that detail and shows Configuration. **This is almost always a wrong or mismatched OAuth 2.0 Client Secret, or a misconfigured provider. It is not “user denied.”** User denied is `AccessDenied`. | On Vercel, `AUTH_TWITTER_ID` / `AUTH_TWITTER_SECRET` must be the **current** OAuth 2.0 Client ID and Client Secret from the X portal. Not the OAuth 1.0 API Key or API Key Secret. If you regenerated the secret, the old value is dead. Save, **redeploy**, try again. Also confirm `AUTH_SECRET` is set and `AUTH_URL` is `https://www.fernandesjourneys.com`. |
| `OAuthCallbackError` (also shown for `OAuthCallback`) | X accepted Authorize, then returned an OAuth error Auth.js could show (callback URL, PKCE/state cookie, or profile). | www callback listed exactly. `AUTH_URL` is the www origin so the callback host matches the browser. |
| `AccessDenied` | The app refused the user. | `/cms/users` — the X user is disabled. Re-enable and try again. |
| `Verification` | An email sign-in link was invalid or expired. | Not the X button. Use the link from the latest email, or start again. |
| `OAuthAccountNotLinked` | That email is already stored on a different sign-in method. | Unusual for X, which usually has no email. Sign in with the original method. |
| `MissingCSRF` | The sign-in request expired or the CSRF cookie was dropped. | Refresh `/login` and start X again. Do not mix www and apex in the same attempt. |

X OAuth 2 usually returns **no email**. That is expected. The account is stored under the X user id with an empty email, and sign-in still completes. It does not merge with Google or email/password unless X actually returned an address.

Redeploy after any env change. The X button can be visible (vars present at build/runtime) while the secret or callback is still wrong.
