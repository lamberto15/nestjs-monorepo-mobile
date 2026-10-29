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
    (app)/             signed-in screens, guarded by the session
  api/
    client/            the backend's typed client, copied by `pnpm client:sync`; never edit
    public-api.ts      API_URL and `publicApi`: calls without a session
    api.ts             `api`: calls with the session's access token
    session.ts         tokens: secure storage, single-flight refresh, sign-out
    query-client.ts    TanStack Query defaults (retries per error kind)
    realtime.ts        the one `createRealtime()` connection          (planned)
  features/<name>/     a feature's hooks, flow logic and tests (auth: sign-in-flow,
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

No global store library until a real need appears.

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

## Performance

The React Compiler is on (`experiments.reactCompiler`): don't add
`useMemo`/`useCallback` by hand. Use `expo-image` for images and a
virtualized list (`FlatList`, or `FlashList` if profiling asks for it) for
anything paginated.
