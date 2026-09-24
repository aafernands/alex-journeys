# Alex Journeys - Security Phase 3

## Atomic CMS writes

| Operation | Files written | Before | After | Test coverage |
| --- | --- | --- | --- | --- |
| Author photo | `public/brand/alex-fernandes.*`, `src/data/author-photo.json` | Sequential Contents API commits | One Git data API commit with both current SHAs | Success, stale SHA, blob failure, metadata failure, retry |
| Site design logos | Up to two files under `public/brand`, `src/data/site-design.json` | Each logo committed separately, then metadata | One Git data API commit | Shared transaction tests |
| Site design hero | New file under `public/media`, media index, `src/data/site-design.json` | Image commit, best-effort media index, metadata commit | One Git data API commit including the media index | Shared transaction tests |
| Posts/pages/media/trip planner | Existing Phase 2 paths | Atomic transaction | Unchanged; retained | Existing Phase 2 tests |

All transaction writes use current blob SHAs, create no force pushes, and surface conflict/failure errors without reporting success. A retry must reload the latest files and their SHAs.

## CMS route authorization tests

Phase 3 adds mocked route-boundary coverage for representative handlers. The mocks stop Firebase, GitHub, and external services from being contacted. The authorization contract is:

| Scenario | Expected |
| --- | --- |
| No session and no passcode | `401` |
| Normal reader session | `401` |
| Allowlisted Auth.js admin | Handler proceeds past the auth boundary |
| Valid passcode session | Handler proceeds past the auth boundary |
| Tampered or expired passcode | `401` |
| `isAdmin: true` without an allowlisted email | `401` |
| Client role/admin/email fields | Ignored by the server gate |

## CSP report-only

Configured in `next.config.ts` as `Content-Security-Policy-Report-Only`. It is emitted for production builds only and is deliberately not enforcing.

```text
default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; script-src 'self' 'unsafe-inline' https://pagead2.googlesyndication.com https://www.googletagmanager.com https://www.google-analytics.com https://challenges.cloudflare.com https://www.viator.com https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://images.unsplash.com https://lh3.googleusercontent.com https://pbs.twimg.com https://abs.twimg.com https://www.viator.com; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://challenges.cloudflare.com https://www.viator.com https://api.stripe.com https://api.liteapi.travel https://book.liteapi.travel; frame-src 'self' https://challenges.cloudflare.com https://www.viator.com https://*.viator.com https://js.stripe.com https://hooks.stripe.com; form-action 'self'
```

- `pagead.googlesyndication.com`, `google-analytics.com`, and `googletagmanager.com` support the existing Ads/GA integration.
- `challenges.cloudflare.com` supports Turnstile script, frame, and verification traffic.
- `www.viator.com` and its widget frames support the existing Viator embed.
- `js.stripe.com`, `hooks.stripe.com`, and `api.stripe.com` support Stripe Elements returned by Nuitee.
- The image hosts match the configured Next Image remote patterns and existing profile/avatar usage.
- Next/font is self-hosted by Next, so no Google font origin is required.
- Inline script/style allowances remain because the root layout has a theme bootstrap script, GA inline initialization, JSON-LD, and framework/widget styling. These must be replaced with nonces or hashes before enforcement.

No report collector is configured. Browser CSP violation reports appear in developer tooling; an aggregate reporting destination should be selected and added with `report-to`/`report-uri` after observing production traffic. Do not switch to enforcement until all legitimate violations are classified, inline allowances are removed or narrowly hashed/nonced, and widget/OAuth/checkout flows are verified.

## Firebase Admin v14 assessment

| Area | Current usage | Potential v14 impact | Risk | Required change |
| --- | --- | --- | --- | --- |
| Initialization | Lazy `initializeApp(cert(...))`, cached app | API remains familiar; dependency/runtime changes need verification | Medium | Review release notes and run build/auth tests on a branch |
| Firestore | `getFirestore`, named database option, transactions and queries | Firestore client dependency changes may alter peer/runtime requirements | Medium | Run comments, users, saved posts, trips, and inbound tests against emulator or mocks |
| Auth/admin APIs | Firebase Admin is used for Firestore-backed user flows; no Admin Auth calls found | No direct Auth migration identified | Low | Reconfirm dependency exports and typecheck |
| Storage | No Firebase Storage usage found | None expected | Low | No change |
| Lifecycle | Cached singleton, existing app reuse | No known lifecycle dependency | Low | Keep lazy initialization and existing-app reuse |
| Emulator | No Firebase emulator branch/configuration found | No known impact | Low | Add explicit emulator verification if introduced |

Firebase Admin remains at `13.10.0`. Official v14 notes require Node 22+, remove legacy namespace support, and upgrade Firestore to 8.6.0; this repo already uses modular imports, but its deployed Node runtime and Firestore behavior still need a dedicated verification run. It was **not upgraded** because that uncertainty is meaningful and npm audit wording alone is insufficient to establish low risk. Prepare a separate Phase 4 upgrade branch with runtime, Firestore, and dependency-chain verification; do not use `npm audit fix --force`.

## CMS_PASSCODE recommendation

**B. Keep, but strictly as emergency break-glass access.** Auth.js allowlisted admin access is the normal path. The passcode is independently revocable only by rotating/removing the shared deployment secret, has limited per-operator auditability, and therefore materially increases attack surface. Keep it for recovery until an individually attributable replacement exists.

Recommended follow-up: rotate it after every emergency use, keep the cookie lifetime at the shortest operationally acceptable value, document the incident/use, and add an audit event that records successful break-glass use without recording the passcode.

## Security headers

The Phase 2 `nosniff`, same-origin frame protection, strict-origin referrer policy, and restrictive camera/microphone/geolocation policy remain. Production now also emits HSTS (`max-age=31536000; includeSubDomains`); local development does not. CSP `frame-ancestors 'self'` is report-only and does not replace the existing compatibility header yet.

## Remaining risks

- **High:** CSP is not enforcing and has no aggregate report destination.
- **Medium:** CSP still permits `unsafe-inline` until nonce/hash work is practical.
- **Medium:** Firebase Admin v14 advisories and breaking changes remain unassessed against a verified upgrade build.
- **Low:** Shared passcode access is less attributable than Auth.js admin access.
