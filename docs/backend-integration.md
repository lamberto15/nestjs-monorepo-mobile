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
pnpm client:sync            # copy the client at the pinned commit
pnpm client:sync <ref>      # pin another commit (a branch or tag resolves to its sha)
pnpm client:check           # fail when the copy differs from the pin (CI)
```

`client-sync.json` names the source repository and the pinned commit: a
project points `repo` at its own backend once, and its own routes then come
typed with the rest. A private backend repository needs `GITHUB_TOKEN`.

- The copy lives in `src/api/client/` (`scripts/client-sync.mjs`). Never
  edit it: change the backend and sync again.
- Its relative imports end in `.js` (written for Node's resolution);
  `metro.config.js` resolves them to the `.ts` files, so the copy stays
  byte-for-byte the backend's.
- Sync deliberately, in its own PR (`build(client): sync to <sha>`), and
  fix whatever TypeScript then reports: that is the point of the types.
- The client's `CHANGELOG.md` (backend repo) says what changed.

## Calling the API

Two clients, both in `src/api/`:

- `publicApi` (`public-api.ts`): no credentials, for sign-in, sign-up,
  `GET /v1/auth/methods` and the token refresh itself.
- `api` (`api.ts`): the session's access token on every request
  (`credentials: { token: () => session.accessToken() }`).

Both send the device language (`Accept-Language`, used while the user saved
none) and make `Idempotency-Key`s with `expo-crypto` (React Native has no
`crypto.randomUUID`). What the client does for you (backend
`api-conventions`):

- **Errors** (RFC 9457) are **thrown** as
  `ApiError { status, code, detail, errors?, requestId }`; `unwrap(call)`
  returns the data. Show `errors[].message` next to the field at `errors[].path` (already in the
  user's language).
- **Idempotency:** every `POST` gets an `Idempotency-Key`. To retry an
  operation safely (a flaky network), send the same key again.
- **Pagination:** `api.items(path, query)` / `api.pages()` follow
  `nextCursor`; pair with `useInfiniteQuery`.
- **ETags:** send `etagOf(read)` as `If-Match` on `PATCH`/`DELETE`; 412
  `precondition_failed` means someone changed it: refetch and ask.

## Tokens (backend `auth`, "Mobile apps")

| Step     | Route                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sign in  | `POST /v1/auth/token { email, password, code?, recoveryCode?, tenantId? }` → `{ accessToken, refreshToken, expiresIn }` |
| Renew    | `POST /v1/auth/token/refresh { refreshToken }` → a new pair                                                             |
| Sign out | `POST /v1/auth/token/revoke { refreshToken }`                                                                           |

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
- A refresh the API refuses (a 4xx) ends the session: clear storage, go to
  sign-in. A network error or a 5xx keeps it for the next attempt (offline
  at launch stays signed in).
- Implemented in `src/api/session.ts`; `useSessionStatus()` gives screens
  `restoring`, `signedIn` or `signedOut`, and the root layout guards the
  routes with `Stack.Protected`.

## Sign-in methods

As built: `src/features/auth/sign-in-flow.ts` (password → two-factor →
tenant, the credentials in memory for the flow only),
`src/app/(auth)/` (the screens), `src/features/auth/hooks.ts` (sign-up,
forgot password, `me`). Email links (verification, password reset) open
the web app; the app then says "check your email" and returns to sign-in.
Passkeys come with the account phase (a development build).

| Method                    | Status                     | How                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Password                  | built                      | `POST /v1/auth/token`                                                                                                                                                                                                                                                                                                                                                      |
| Two-factor                | built                      | the first `/token` answers the problem `mfa_required`; ask for the code and send the same request with `code` (or `recoveryCode`)                                                                                                                                                                                                                                          |
| Sign-up                   | built                      | `POST /v1/auth/sign-up` when `GET /v1/auth/methods` says it's on; then verify the email, then `/token`                                                                                                                                                                                                                                                                     |
| Passkeys                  | account phase              | `POST /v1/auth/passkeys/sign-in/options` → the platform's passkey API → `POST /v1/auth/passkeys/token { response, code?, tenantId? }`. Needs a dev build, and on the backend `PASSKEY_APPLE_APPS` (`TEAMID.bundle.id`) and `PASSKEY_ANDROID_APPS` (package and signing SHA-256), which it serves as `apple-app-site-association` and `assetlinks.json` on the RP ID's host |
| Google, Microsoft, GitHub | **blocked on the backend** | see below                                                                                                                                                                                                                                                                                                                                                                  |
| Magic link                | **blocked on the backend** | see below                                                                                                                                                                                                                                                                                                                                                                  |

`GET /v1/auth/methods` says what this backend offers: show only those.

**Bot protection.** When `methods.captcha` is set (Turnstile), sign-in, its
two-factor step, sign-up and forgot-password want a widget token in
`X-Captcha-Token`, always or after a 403 `captcha_required`
(`captcha.mode`). **Decided:** no widget in the app; the safe exemption is
app attestation (App Attest, Play Integrity), tracked as
[backend #953](https://github.com/lamberto15/nestjs-monorepo-template/issues/953).
Until it lands, run the backend with `CAPTCHA_MODE` unset (the default);
when a captcha is required the app says so (`errors.captcha`) instead of
failing silently.

**Blocked: provider sign-in and magic links.** Today both end in the web
app: the OIDC callback sets the session cookie and redirects to `WEB_URL`,
and email links open `WEB_URL` pages. An app needs a way to get **tokens**
instead, e.g. the provider flow opened with `expo-web-browser`'s auth
session and redirecting to the app's scheme with a one-time code the app
exchanges for tokens, and the magic link opening the app (universal/app
links) and verifying into tokens. That's a backend change, tracked as
[backend #952](https://github.com/lamberto15/nestjs-monorepo-template/issues/952);
the app's screens wait for it.

## Tenants (backend `tenancy`)

Tokens act in **one tenant**: `tenantId` at sign-in, else the last one
chosen. After sign-in the app reads `GET /v1/auth/tenants` with the new
tokens (before the session holds them); with one it starts the session,
with several it shows the picker (`choose-tenant`), the `current` one first.
Choosing the current one keeps the tokens; another means a **new token
sign-in** with its `tenantId` (the cookie route `POST /v1/auth/tenant` is
for browsers, and `/v1/auth/token/refresh` takes no `tenantId`), with a
fresh two-factor code when the account has two-factor; the first pair is
revoked only after the new one arrives. Switching later, from inside the
app, waits for
[backend #954](https://github.com/lamberto15/nestjs-monorepo-template/issues/954)
(`tenantId` on refresh). Clear the query cache on a switch: every cached
answer belongs to the old tenant. With
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

One socket while signed in (`src/api/realtime.ts`, opened by
`useRealtimeNotifications()` in the signed-in layout), the token asked on
every (re)connection. Events are typed (`notification`,
`notifications.unread-count`, …: the client's README) and change the
TanStack Query cache directly (`src/features/notifications/cache.ts`).
Events sent while offline are **not replayed**: every `connect` refetches
the notifications and the count. The socket disconnects when the app goes
to the background and reconnects when it comes back; signing out unmounts
the layout, which closes it.

## Notifications (backend `notifications`)

The Notifications tab: `GET /v1/notifications` a page at a time (cursor),
the tab's badge from `GET /v1/notifications/unread-count` (`99+` above 99
or when capped). Tapping an unread one marks it read
(`POST /v1/notifications/{id}/read`); "Mark all read" sends `before` = the
newest one shown, so what arrives meanwhile stays unread. A notification's
`link` (a web app path) is not opened yet.

## Account (backend `auth`)

- **Profile:** the name, `PATCH /v1/auth/me { name }`.
- **Language:** saved on the account (`PATCH /v1/auth/me { locale }`), so
  the API answers and mails in it too; the signed-in layout applies a saved
  language at start. Switching between left-to-right and right-to-left
  (Arabic) applies on the next launch: React Native reads the direction at
  start (`src/features/account/language.ts`).
- **Sessions:** `GET /v1/auth/sessions` lists **browser sessions only**; a
  token client such as this app is not in it, so the app can end other
  sessions and "sign out everywhere" (which ends its own too), but not
  show itself. Tracked:
  [backend #956](https://github.com/lamberto15/nestjs-monorepo-template/issues/956).

## User-Agent

Every call sends `User-Agent: <name>/<version> (<model>; <OS> <version>)`
(`src/api/public-api.ts`), for the API's sessions, sign-in log, audit and
new-sign-in alerts. Without it the platform's default goes (Expo Go's
`Expo/…`, Android's `okhttp/…`), which the API labels by its first word
("Expo"). The API reads `iPhone`/`iPad` and `Android` in it, so it now says
"iOS" or "Android"; naming the app ("NestJSMobile on iOS") is part of
backend #956. The realtime socket keeps the platform's agent.

## Languages and time (backend `i18n-and-time`)

The backend speaks `en`, `de`, `ar` (right to left), `zh`, `ms`. The app
sends the user's language (`lang`), keeps its own UI texts in the same
languages, and saves the choice with `PATCH /v1/auth/me { locale }`. Dates
come as ISO strings in UTC; show them in the user's time zone.
