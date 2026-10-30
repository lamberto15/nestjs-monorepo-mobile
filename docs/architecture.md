# Architecture

> Folders marked _(planned)_ arrive with later phases
> ([decisions](decisions.md#roadmap)); update this file as they land.

## Folders

```
src/
  app/                 routes only (Expo Router): screens and _layout.tsx
    _layout.tsx        providers, session restore, Stack.Protected guards
    (auth)/            signed-out: sign-in, two-factor, choose-tenant, sign-up,
                       forgot-password, check-email
    (app)/             signed-in, guarded by the session: native tabs, each a stack
      (home)/          the starting point of your own features
      notes/           the example feature: list, [id], [id]/edit, new
      notifications/   the list; the tab's badge is the unread count
      account/         profile, language, sessions, sign out
  api/
    client/            the backend's typed client, copied by `pnpm client:sync`; never edit
    public-api.ts      API_URL and `publicApi`: calls without a session
    api.ts             `api`: calls with the session's access token
    session.ts         tokens: secure storage, single-flight refresh, sign-out
    query-client.ts    TanStack Query defaults (retries per error kind)
    realtime.ts        the one `createRealtime()` connection          (planned)
  features/<name>/     a feature's hooks, flow logic and tests (auth, account,
                       notifications; auth: sign-in-flow,
                       hooks, errors, navigation)
  components/          shared components (themed-text, themed-view, screen,
                       text-field, button)
  hooks/               shared hooks (theme, color scheme, session status)
  constants/theme.ts   design tokens: colors, spacing, typography
  i18n/                i18next setup and locales/<lang>.json
  types/               ambient types
  test/                Jest setup and the fake API for tests
assets/                icons, splash
scripts/               client-sync.mjs
```

`src/app/` holds routes only: everything else lives outside it, so Expo
Router doesn't treat it as a screen.

## Layers

1. **Screen** (`src/app/…`): layout and navigation; reads hooks, renders.
2. **Feature hooks** (`src/features/<name>/`): TanStack Query queries and
   mutations around the client (`useNotifications()`, `useSignIn()`).
3. **API** (`src/api/`): one client, one session, one realtime connection.

A screen never calls `fetch` or the client directly; a feature hook does.

## State

| Kind                     | Where                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Server data              | TanStack Query (cache, retries, refetch on focus and reconnect)                        |
| Session (tokens, tenant) | `src/api/session.ts`, persisted in `expo-secure-store`, read with `useSessionStatus()` |
| Forms                    | TanStack Form + zod (as the backend's web app)                                         |
| UI-only                  | component state                                                                        |

No global store library until a real need appears, as in the backend's
web app: server data is TanStack Query's (realtime events update its cache),
the session lives outside React because the API client reads it. Reach for
one (Zustand is small) only for client-only state that several screens
share and the server doesn't own: offline drafts, a cart, a multi-screen
wizard.

## Navigation

Expo Router with typed routes (`experiments.typedRoutes`). The root layout
keeps the splash screen up while the stored session is checked, then guards
the routes with `Stack.Protected`: `(app)` when signed in, `sign-in` when
not (`redirectTo` sends the other way). Signing out clears the query cache.
Deep links use the `scheme` in `app.json`.

## Styling

`StyleSheet` with the tokens in `src/constants/theme.ts` (light and dark),
the themed components, and `@expo/ui` for native controls. Right-to-left
layout must work: Arabic is one of the backend's languages.

## Loading, errors, offline

- A screen's failed load shows `ErrorState` (the API's message, or ours,
  with "Try again"); a failed action shows its message where it happened.
- Requests time out after 20 s (`appFetch` in `src/api/public-api.ts`).
- Offline (`expo-network` drives TanStack Query's `onlineManager`), queries
  and saves pause and continue when the network is back; `OfflineBanner`
  says so at the top.

## Privacy and links

- **App switcher:** `PrivacyCover` covers the screen whenever the app is
  not in front, so the system's snapshot shows no data.
- **App lock** (Account → Security, on a device with a face or fingerprint
  enrolled): asks when the app opens and after a minute in the
  background; the setting is in the secure store and turned off on
  sign-out. Face ID needs a development build (Expo Go falls back to the
  passcode).
- **Links in:** Expo Router opens `scheme://notes/1` and web paths by
  itself; one that arrives signed out is kept (`pendingLink`) and opened
  after sign-in. Every screen a link may open is in `RECORD_ROUTES` /
  `APP_ROUTES` (`src/features/notifications/link.ts`).
- **iOS privacy manifest** (`ios.privacyManifests` in app.json): the
  required-reason APIs of the installed native packages (UserDefaults,
  file timestamps, boot time, disk space), read from their
  `PrivacyInfo.xcprivacy`. A new native dependency: check its file and add
  what it lists. Usage strings: camera, photos, Face ID.

- **Unsaved changes:** forms (the Notes form) ask before leaving with
  changes (`usePreventRemove`); a successful save goes through.
- **Feedback:** `feedback.success()` / `.warning()` (haptics) after saves,
  decisions and before discarding.
- **Offline read cache** (`src/api/offline-cache.ts`): what was already
  viewed opens offline. Only queries that opt in are kept
  (`meta: { persist: true }` and `gcTime: MAX_AGE_MS`: the Notes list, a
  note, `me`), for 7 days, in an SQLCipher database (`expo-sqlite` with
  `useSQLCipher`) whose random key is in the secure store. Encrypted or
  nothing: without SQLCipher (Expo Go, web) `PRAGMA key` is ignored, so
  the app checks `PRAGMA cipher_version` and keeps nothing. It holds one
  person in one tenant: restored at once (offline, `me` can't load), then
  deleted if `me` says it was someone else's or another tenant's, and
  deleted with its key on sign-out. Saves while offline still wait for the
  network; nothing is written offline.
- **Wide screens** (iPad, `ios.supportsTablet`): `SplitView` puts a list
  beside what it opens (`useWide()`: 768 points and up). Notes uses it in
  `notes/_layout.tsx`, the list as `NotesList` and the index route as
  "Choose a note."; `pnpm feature:add` copies that. Approvals stay one
  column (they live in the Home stack).

## Telemetry

Off by default. A project plugs its analytics in once
(`telemetry.use({ track(event, props) {…} })`, e.g. in the root layout);
events then go out only while the account has the backend's `analytics`
consent at its current version (declare that kind in the backend's
`CONSENT_KINDS`; Account → Your data shows it). `telemetry.track()` drops
personal keys and cuts emails and tokens; screen views carry routes with
ids removed. Crash reporting (#14) follows the same consent. Tracking
across apps is not done, so no App Tracking Transparency prompt.

## Accessibility

- Colours meet WCAG AA: text on `primary` and `dangerFill` and `link` on
  the background are at least 4.5:1 in both themes (the values in `theme.ts` say their ratio).
  Check a new colour pair before using it.
- `ThemedText` announces `title` and `subtitle` as headings; a chosen row
  passes `selected` to `ListRow`; a row whose look carries meaning (an
  unread dot) gets an `accessibilityLabel` that says it.
- Text scales with the system font size: don't fix heights around text.

## Performance

The React Compiler is on (`experiments.reactCompiler`): don't add
`useMemo`/`useCallback` by hand. Use `expo-image` for images and a
virtualized list (`FlatList`, or `FlashList` if profiling asks for it) for
anything paginated.
