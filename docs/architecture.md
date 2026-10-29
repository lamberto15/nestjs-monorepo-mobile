# Architecture

> Describes the target layout. Folders marked *(planned)* arrive in phase 2
> ([decisions](decisions.md#roadmap)); update this file as they land.

## Folders

```
src/
  app/                 routes only (Expo Router): screens and _layout.tsx
    (auth)/            signed-out stack: sign-in, two-factor, sign-up   (planned)
    (app)/             signed-in tabs, guarded by the session           (planned)
  api/                                                                  (planned)
    client/            the backend's typed client, copied by `pnpm client:sync`; never edit
    api.ts             the one `createApiClient()` instance
    session.ts         tokens: secure storage, single-flight refresh, sign-out
    realtime.ts        the one `createRealtime()` connection
  features/<name>/     a feature's hooks, components and queries (auth, tenants, notifications…)
  components/          shared components (themed-text, themed-view, ui/)
  hooks/               shared hooks (theme, color scheme)
  constants/theme.ts   design tokens: colors, spacing, typography
  i18n/                i18next setup and locales/<lang>.json              (planned)
assets/                icons, splash, fonts
scripts/               repo scripts (client sync)
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

| Kind | Where |
| --- | --- |
| Server data | TanStack Query (cache, retries, refetch on focus and reconnect) |
| Session (tokens, tenant) | `src/api/session.ts`, persisted in `expo-secure-store`, exposed by a React context |
| Forms | TanStack Form + zod (as the backend's web app) |
| UI-only | component state |

No global store library until a real need appears.

## Navigation

Expo Router with typed routes (`experiments.typedRoutes`). The root layout
decides between the `(auth)` and `(app)` groups from the session
(`Stack.Protected` or a redirect: check the SDK 58 docs). Deep links use the
`scheme` from the app config.

## Styling

`StyleSheet` with the tokens in `src/constants/theme.ts` (light and dark),
the themed components, and `@expo/ui` for native controls. Right-to-left
layout must work: Arabic is one of the backend's languages.

## Performance

The React Compiler is on (`experiments.reactCompiler`): don't add
`useMemo`/`useCallback` by hand. Use `expo-image` for images and a
virtualized list (`FlatList`, or `FlashList` if profiling asks for it) for
anything paginated.
