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
(`captcha.mode`). **Decided:** no widget in the app; app attestation
instead. The backend has it (`APP_ATTESTATION=on`: `X-App-Attestation` with
App Attest or Play Integrity, challenges from
`POST /v1/auth/app-attestation/challenge`; backend `auth`, "App
attestation"); the app side needs a development build and a paid Apple team
or Android, so it waits. Meanwhile run with `CAPTCHA_MODE` unset (the
default); when a captcha is required the app says so (`errors.captcha`).

**Next: provider sign-in and magic links.** The backend hands tokens to
apps now: a provider or tenant-SSO login started with `redirectUri` (one of
`NATIVE_REDIRECT_URIS`) and a PKCE `codeChallenge` ends at
`redirectUri?code=…`, and `POST /v1/auth/token/exchange { handoffCode,
codeVerifier, code?, recoveryCode?, tenantId? }` answers tokens;
`POST /v1/auth/magic-link/handoff` does the same for a link the app opens
(a universal/app link, so a paid Apple team or Android). Provider sign-in
fits `expo-web-browser`'s auth session in Expo Go; it waits for a provider
configured on the test server.

## Tenants (backend `tenancy`)

Tokens act in **one tenant**: `tenantId` at sign-in, else the last one
chosen. After sign-in the app reads `GET /v1/auth/tenants` with the new
tokens (before the session holds them); with one it starts the session,
with several it shows the picker (`choose-tenant`), the `current` one first.
Choosing the current one keeps the tokens; another re-issues them there
with `POST /v1/auth/token/refresh { refreshToken, tenantId }`: no password
or code again. Later, Account → Organization does the same
(`session.switchTenant`): it waits for any refresh in flight and holds the
refresh slot itself (two refreshes would spend one token), and a refusal
(not a member: 401, the token left unspent) keeps the session as it was.
Every cached answer belonged to the old tenant, so all queries reset; the
realtime socket reconnects with the new token. With
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
`link` opens in the in-app browser: an absolute URL as it is, a web app path
on `EXPO_PUBLIC_WEB_URL` (unset: not opened; `features/notifications/link.ts`).

**Settings** (Account → Notifications): per type, email `false` /
`immediate` / `hourly` / `daily` and the push and SMS switches the server
offers (`GET /v1/notifications/types`: a channel appears once its provider
is configured; mandatory types can't be switched off).
`PUT /v1/notifications/preferences` **replaces** the whole set, so the app
sends every choice with the one changed (`withChannel`). Quiet hours
(`/v1/notifications/quiet-hours`, `HH:MM` on the clock of the account's time
zone) hold push and SMS back; the screen offers to set the account's time
zone to the phone's when they differ.

## Account (backend `auth`)

- **Profile:** the name, `PATCH /v1/auth/me { name }`.
- **Language:** saved on the account (`PATCH /v1/auth/me { locale }`), so
  the API answers and mails in it too; the signed-in layout applies a saved
  language at start. Switching between left-to-right and right-to-left
  (Arabic) applies on the next launch: React Native reads the direction at
  start (`src/features/account/language.ts`).
- **Sessions:** `GET /v1/auth/sessions` lists browser sessions and apps
  (`kind`: `browser` / `app`; an app is a token family), this app's own
  marked `current` and shown first as "This device". Any other one can be
  ended (`DELETE /v1/auth/sessions/{id}`; an app's realtime connections end
  with it); this device signs out from Account. "Sign out everywhere" ends
  this one too.

## Step-up and the account's lifecycle (backend `auth`)

- **Step-up.** Sensitive routes answer 403 `reauthentication_required`
  when the sign-in isn't recent. `withStepUp(call)`
  (`src/features/account/step-up.ts`) opens the "Confirm it's you" modal
  (`src/app/reauthenticate.tsx`: the methods from
  `GET /v1/auth/reauthenticate`), then runs the call again; closing it
  rejects with `StepUpCancelled`, which screens don't show as an error.
  `session.reauthenticate(proof)` sends the refresh token with the proof:
  the API revokes that family and answers a new pair, so it runs in the
  refresh slot like a tenant switch. An account that signs in only by link
  or provider can't prove it here: sign out and in again (provider step-up
  comes with #12).
- **Delete account** (an App Store and Google Play requirement):
  `POST /v1/account/deletion { password? }` (the password when
  `hasPassword`), after the grace period; this device stays signed in to
  cancel (`DELETE /v1/account/deletion`), every other sign-in ends. The
  pending deletion is `GET /v1/account` → `deletion`; Account shows it.
- **Your data:** `POST /v1/account/export` (JSON), `GET /v1/account/exports`
  polled while one is being made; a completed one's link lasts 30 minutes,
  so it is read again before opening. Consents: `GET /v1/account/consent-kinds`
  and `/consents`; an acceptance of an older version is asked for again; a
  required kind can be accepted, not withdrawn.
- **Two-factor:** enroll (the secret and its `otpauth://` link: "Open in
  authenticator app", or copy the key; a QR on the same phone can't be
  scanned), confirm with the first code, recovery codes shown once, new
  codes, turn off.
- **Password change** signs out every token client, this app included: it
  says so and signs out.
- **Avatar:** `PUT /v1/account/avatar` (multipart `file`, the picked photo
  as an `expo-file-system` `File`), `DELETE` to remove.

## Files (backend `attachments`)

- **Upload:** multipart, the field `file` (`expo-file-system` `File` from
  the camera, photo library or files app), checked against the type's
  `attachmentLimits.maxBytes` before sending; the API reads the type from
  the bytes (415 for one not allowed).
- **Download:** `GET /v1/attachments/{id}/download` needs the token and
  answers 302 to a signed link valid 5 minutes. `signedLink()`
  (`src/api/signed-link.ts`) reads the redirect without following it
  (`redirect: 'manual'`), so the browser, an image (`?rendition=thumb`) or
  the share sheet gets a link that needs no credentials.
- A new file is `pending` while scanned and rendered (its download: 409):
  the list looks again every few seconds until it's ready, and the realtime
  `record.attachments.changed` refreshes it for watchers.
- Not built: presigned and resumable uploads (S3), file versions.

## Work surfaces (backend `work-surfaces`)

Home shows the **inbox** (`GET /v1/inbox`: approvals to decide or revise,
unread mentions; dismiss what allows it), **favorites** and **recently
opened** (`/v1/recents`: a record's title only, never its content); no
realtime event covers the inbox, so it reads again when Home is focused.
**Search** (`GET /v1/search`) lists hits by kind; a snippet's `<b>…</b>`
marks matches and is split into text, never rendered as HTML.
**Presence** (`PUT /v1/presence/{subject}/{id}` every 15 s, only while the
screen is focused and the app in front; `DELETE` on leaving) says who else
views or edits a record: advisory, saving is still guarded by the ETag.
Everything opens through one resolver (`openTarget`): a subject with a
screen in `RECORD_ROUTES`, else an app path, else the web app.

## Approvals and acknowledgments (backend `approvals`, `acknowledgments`)

Home → Approvals lists requests to decide (`?assignedToMe=true&status=pending`),
your own (`requestedByMe`) and what you decided (`decidedByMe`). A request
shows its payload, stage and timeline; the decisions offered are its `can`
(approve, request changes, reject, resubmit, cancel), each sending the
request's ETag as `If-Match` (412: someone decided meanwhile, it reloads).
Reject and request changes need a reason. The realtime `approval.assigned`,
`approval.decided` and `approval.applied` reload lists and the inbox.
Approval policies and delegations are admin work, left to the web app.
Home → Documents to acknowledge: open the document (signed link), then
`POST /v1/attachments/{id}/acknowledge`.

## User-Agent

Every call sends `User-Agent: <name>/<version> (<model>; <OS> <version>)`
(`src/api/public-api.ts`), for the API's sessions, sign-in log, audit and
new-sign-in alerts. Without it the platform's default goes (Expo Go's
`Expo/…`, Android's `okhttp/…`), which the API labels by its first word
("Expo"). With it the API labels the app "NestJSMobile on iOS" (its name
and the system it reads from `iPhone`/`iPad` or `Android`); a token
sign-in keeps that label for the whole family. The realtime socket keeps
the platform's agent.

## Languages and time (backend `i18n-and-time`)

The backend speaks `en`, `de`, `ar` (right to left), `zh`, `ms`. The app
sends the user's language (`lang`), keeps its own UI texts in the same
languages, and saves the choice with `PATCH /v1/auth/me { locale }`. Dates
come as ISO strings in UTC; show them in the user's time zone.
