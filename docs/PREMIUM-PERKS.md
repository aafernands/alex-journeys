# Premium perks

What membership opens, where it is enforced, and how Alex manages it. Membership
is `users/{id}.membership` in Firestore; `isPremium` (active or trialing on a
Premium price) decides. Server code reads it through `getReaderMembership`
(`src/lib/premium-access.ts` wraps it for pages and APIs).

| Perk | Free | Member | Enforced |
| --- | --- | --- | --- |
| Members-only stories | Excerpt, then the gate | Full story | Server: `BlogPostView` |
| Saved trips | 5 | 200 (shown as unlimited) | Server: `createTrip` in `src/lib/trips.ts` (used by `POST /api/trips` and saved hotels). 409 `code: "trip_limit"` |
| Trip PDF download | Yes | Yes | Not gated |
| Share a trip link | Prompt to join | Yes | Planner UI only. The link is built in the browser (the plan rides in the URL hash), so there is no server step to gate. Opening a shared link stays free. |
| Downloads (PDF guides, Lightroom presets) | Titles, locked | Download | Server: `GET /api/premium/download/[id]` (401 signed out, 403 not a member) |
| Weekly deal notes | Titles and dates, locked | Full notes | Server: deal notes are always `membersOnly`, so the post page gates them |
| Deal notes by email | | Coming soon | Not built |
| Member hotel rates | | Coming soon | Not built; booking is never gated |

Trips already over the limit (for example after a membership ends) are never
deleted. Only new saves stop.

## Pages

- `/premium/perks`: members hub. Linked from Account → Settings → Membership, the
  account menu, and the phone drawer (members only).
- `/premium/downloads`, `/premium/deals`: each shows a friendly "First ones coming
  soon" when empty.

## Downloads storage

The GitHub repo is public, so member files cannot live in the repo or `public/`
(anyone could fetch them from github.com). Files are stored in Firestore through
the Admin SDK, which only the server can reach:

- `memberDownloads/{id}`: title, description, type, cover, file name, size, sha256.
- `memberDownloads/{id}/chunks/v{version}-{n}`: the bytes in 750 KB pieces
  (a Firestore document tops out at 1 MiB).

Limit: 4 MB per file (`MAX_MEMBER_FILE_BYTES`). Vercel functions accept about
4.5 MB per request and response, and each file passes through one on upload and
one on download. Allowed: `.pdf`, `.zip`, `.xmp`, `.lrtemplate`, `.dng`.

Manage them at CMS → Downloads (`/cms/downloads`, same admin check as the rest
of the CMS). Changes are live immediately; there is no GitHub publish step.

If files ever need to be larger, move the bytes to a private bucket (Firebase
Storage or Vercel Blob private) and have the download route redirect to a short
signed URL after the same membership check.

## Deal notes

In the post editor, tick **Deal note** (under Members). It forces Members only.
Deal notes are listed on `/premium/deals`, newest first. They also appear in the
regular story lists with the Members label, like other member stories, but not
in the site-wide "Latest from the road" line.
