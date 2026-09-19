# Mailchimp newsletter

Footer signup posts to `POST /api/newsletter`, which adds the email to your Mailchimp audience.

## Vercel env vars

| Variable | Where to get it |
| --- | --- |
| `MAILCHIMP_API_KEY` | Mailchimp → Account → Extras → API keys → Create |
| `MAILCHIMP_AUDIENCE_ID` | Audience → Settings → Audience name and defaults → Audience ID |

Redeploy after saving secrets (Production + Preview if you test on preview URLs).

## Local

Add the same keys to `.env.local` (gitignored).
