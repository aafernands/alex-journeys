# Post comments (moderated)

Readers can comment on blog posts. Comments are stored in **Cloud Firestore** and stay **pending** until an admin approves them in the CMS. Only **approved** comments appear on the public post page.

Share + Comments jump controls sit next to **Save** on post pages (`PostActions`).

## Public UX

| Control | Behavior |
| --- | --- |
| **Share** | `navigator.share` when available; otherwise copies the post URL and shows “Link copied” |
| **Comments** | Smooth-scrolls to `#comments` |
| Comment form | Signed-in readers post; guests see **Sign in to comment** |
| After submit | “Thanks — your comment is awaiting moderation.” (not live until approved) |
| Threads | One-level replies only (`parentId`); replies are also moderated |

## Firestore shape

Top-level collection (easier to moderate across posts than a per-post subcollection):

```
comments/{commentId}
  {
    slug: string,
    body: string,          // plain text, max 2000 chars
    authorId: string,
    authorName: string,
    authorImage: string | null,
    createdAt: string,     // ISO
    parentId: string | null,
    status: "pending" | "approved" | "rejected",
    updatedAt?: string     // set on moderate
  }
```

Uses the same Firebase Admin credentials as saved posts (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, optional `FIREBASE_FIRESTORE_DATABASE_ID`).

### Indexes

Declared in `firestore.indexes.json` (deploy with `firebase deploy --only firestore:indexes` when the Firebase CLI is linked to the project):

- `status` ASC + `createdAt` DESC (CMS lists)
- `slug` ASC + `status` ASC + `createdAt` ASC (public list)

List helpers fall back to equality filters + in-memory sort if the composite index is missing. Server logs include the Firebase console index URL when Firestore returns failed-precondition. Create the index once (console link or deploy the JSON) so queries stay efficient at scale.

## APIs

| Route | Auth | Notes |
| --- | --- | --- |
| `GET /api/comments?slug=` | Public | Approved only |
| `POST /api/comments` | Reader session | Creates `pending`; body `{ slug, body, parentId? }`; light rate limit (5/min/user) |
| `DELETE /api/comments/[id]` | Author or admin | Also deletes direct replies |
| `GET /api/cms/comments?status=` | CMS (`isCmsAuthenticated`) | `pending` (default), `approved`, `rejected`, `all`; `?pendingCount=1` for badge |
| `PATCH /api/cms/comments/[id]` | CMS | `{ status }` |
| `DELETE /api/cms/comments/[id]` | CMS | Hard delete |

Build succeeds without Firebase env: comment APIs return **503** until configured.

## CMS

- Nav: **Comments** (`/cms/comments`) with pending badge
- Dashboard: pending count + moderate shortcut
- Actions: Approve / Reject / Delete; filters for pending / approved / rejected / all

## Code map

- `src/lib/comment-types.ts` — shared types + body limit (client-safe)
- `src/lib/comments.ts` — Firestore helpers
- `src/app/api/comments/` — public API
- `src/app/api/cms/comments/` — moderation API
- `src/components/blog/PostActions.tsx`, `CommentSection.tsx`
- `src/components/cms/CommentsModerationList.tsx`
- `src/app/cms/comments/page.tsx`

## Out of scope

Moderation queue beyond Approve/Reject/Delete, email notifications, nested threads deeper than one reply level.
