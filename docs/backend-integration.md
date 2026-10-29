# Backend integration

The backend is
[nestjs-monorepo-template](https://github.com/lamberto15/nestjs-monorepo-template).
Its docs are the source of truth; this page says how the app uses them.
Backend doc names below (`auth`, `api-conventions`…) are `docs/<name>.md`
there.

## The typed client

The backend's `packages/api-client` (openapi-fetch on types generated from
the API's OpenAPI document, plus a typed socket.io realtime client) is
private and not published. This app **copies it** from a pinned commit of
**your** backend repository (your project made from the template; the
template itself by default):

```bash
pnpm client:sync            # (planned) copy the client at the pinned commit
pnpm client:sync <sha>      # move the pin to another commit
```

The source repository and commit are configured in one place (planned:
next to the copy), so a project points it at its own backend once. Your
backend's own routes then come typed with the rest.

- The copy lives in `src/api/client/` with the pinned commit recorded next
  to it. Never edit it: change the backend and sync again.
- Sync deliberately, in its own PR (`build(client): sync to <sha>`), and
  fix whatever TypeScript then reports: that is the point of the types.
- The client's `CHANGELOG.md` (backend repo) says what changed.

## Calling the API

```ts
import { createApiClient } from '@/api/client';
import * as Crypto from 'expo-crypto';

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL!,
  credentials: { token: () => session.accessToken() }, // asked before every request
  lang: i18n.language, // a value: recreate the client when the language changes
  idempotencyKey: () => Crypto.randomUUID(), // React Native has no crypto.randomUUID
});
```

Check the client's README at the pinned commit for the exact option names.
What the client does for you (backend `api-conventions`):

- **Errors** (RFC 9457) are **thrown** as `ApiError { status, code, detail,
  errors?, requestId }`; `unwrap(call)` returns the data. Show
  `errors[].message` next to the field at `errors[].path` (already in the
  user's language).
- **Idempotency:** every `POST` gets an `Idempotency-Key`. To retry an
  operation safely (a flaky network), send the same key again.
- **Pagination:** `api.items(path, query)` / `api.pages()` follow
  `nextCursor`; pair with `useInfiniteQuery`.
- **ETags:** send `etagOf(read)` as `If-Match` on `PATCH`/`DELETE`; 412
  `precondition_failed` means someone changed it: refetch and ask.

## Tokens (backend `auth`, "Mobile apps")

| Step | Route |
| --- | --- |
| Sign in | `POST /v1/auth/token { email, password, code?, recoveryCode?, tenantId? }` → `{ accessToken, refreshToken, expiresIn }` |
| Renew | `POST /v1/auth/token/refresh { refreshToken }` → a new pair |
| Sign out | `POST /v1/auth/token/revoke { refreshToken }` |

- The access token lives **15 minutes** (`expiresIn`); keep it in memory and
  renew it a minute before it expires, and on a 401.
- **Refresh tokens rotate, and one presented twice revokes its whole
  family** (the user is signed out everywhere). So refresh is
  **single-flight**: one refresh in progress at a time, every caller awaits
  the same promise. Watch for this when the app returns from background with
  several queries refetching at once.
- Store the refresh token in `expo-secure-store` only. Write the new one
  **before** using the new access token, so a crash can't leave the old,
  already-spent one stored.
- A refresh that fails with 401 ends the session: clear storage, go to
  sign-in.

## Sign-in methods

| Method | Status | How |
| --- | --- | --- |
| Password | first release | `POST /v1/auth/token` |
| Two-factor | first release | the first `/token` answers the problem `mfa_required`; ask for the code and send the same request with `code` (or `recoveryCode`) |
| Sign-up | first release | `POST /v1/auth/sign-up` when `GET /v1/auth/methods` says it's on; then verify the email, then `/token` |
| Passkeys | first release | `POST /v1/auth/passkeys/sign-in/options` → the platform's passkey API → `POST /v1/auth/passkeys/token { response, code?, tenantId? }`. Needs a dev build, and on the backend `PASSKEY_APPLE_APPS` (`TEAMID.bundle.id`) and `PASSKEY_ANDROID_APPS` (package and signing SHA-256), which it serves as `apple-app-site-association` and `assetlinks.json` on the RP ID's host |
| Google, Microsoft, GitHub | **blocked on the backend** | see below |
| Magic link | **blocked on the backend** | see below |

`GET /v1/auth/methods` says what this backend offers: show only those.

**Blocked: provider sign-in and magic links.** Today both end in the web
app: the OIDC callback sets the session cookie and redirects to `WEB_URL`,
and email links open `WEB_URL` pages. An app needs a way to get **tokens**
instead, e.g. the provider flow opened with `expo-web-browser`'s auth
session and redirecting to the app's scheme with a one-time code the app
exchanges for tokens, and the magic link opening the app (universal/app
links) and verifying into tokens. That's a backend change, tracked as
[backend #952](https://github.com/lamberto15/nestjs-monorepo-template/issues/952); the app's screens wait for it.

## Tenants (backend `tenancy`)

Tokens act in **one tenant** (`tenantId` at sign-in). After sign-in:
`GET /v1/auth/tenants`; with one, use it; with several, show the picker.
Switching tenants means a **new token sign-in** with the other `tenantId`
(the cookie route `POST /v1/auth/tenant` is for browsers). Clear the query
cache on a switch: every cached answer belongs to the old tenant. With
`TENANCY=single` the list has one entry and the picker never shows.

`GET /v1/auth/me` (with `can`: every allowed `Subject.action`) and
`GET /v1/features` (which switches are on) decide what the UI offers.

## Push (backend `notifications`, "Push and SMS")

The backend sends through **APNs and FCM directly**, not Expo's push
service. So:

- Get the **native** token with `expo-notifications`'
  `getDevicePushTokenAsync()` (not `getExpoPushTokenAsync()`).
- Register on every app start once signed in:
  `PUT /v1/devices { platform: 'ios' | 'android', name, token }` (refreshes
  the last-seen time; the response's `id` is this device's).
- Remove it on sign-out: `DELETE /v1/devices/{id}`.
- Users turn push on per notification type in their preferences; the
  backend's `PUSH_PROVIDER` must include `apns` / `fcm`.
- Needs a dev build and real credentials (APNs key, FCM `google-services`),
  configured through EAS.

## Realtime (backend `webhooks-and-realtime`)

One socket for the app's life, with the token asked on every
(re)connection:

```ts
createRealtime({ url: process.env.EXPO_PUBLIC_API_URL!, token: () => session.accessToken() });
```

Events are typed (`notification`, `notifications.unread-count`, …: the
client's README). Events sent while offline are **not replayed**: on
`connect` and when the app returns to the foreground, refetch what the
screen shows (the unread count at least). Disconnect when the app goes to
the background, and on sign-out.

## Languages and time (backend `i18n-and-time`)

The backend speaks `en`, `de`, `ar` (right to left), `zh`, `ms`. The app
sends the user's language (`lang`), keeps its own UI texts in the same
languages, and saves the choice with `PATCH /v1/auth/me { locale }`. Dates
come as ISO strings in UTC; show them in the user's time zone.
