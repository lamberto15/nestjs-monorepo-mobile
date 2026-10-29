# Decisions

Decided 2026-10-29, at the start of the project. Change one by editing it
here, with the reason.

| Topic | Decision | Why |
| --- | --- | --- |
| Repository | Separate repo, private | Keeps the backend template lean; the mobile app has its own toolchain (Expo, EAS) |
| API client | Copy the backend's `packages/api-client` from a pinned commit (`pnpm client:sync`) | It isn't published; a copy keeps its errors, pagination and realtime helpers identical, and updates are deliberate |
| Sign-in, first release | Password, two-factor, sign-up, passkeys | All work with the backend's token routes today |
| Provider sign-in, magic link | Wanted, **after a backend change** (token handoff to the app) | Today they end in the web app with a cookie ([backend-integration](backend-integration.md#sign-in-methods)) |
| Tenancy | Multi-tenant with a picker; skipped with one tenant | Works with `TENANCY=single` too |
| Workflow | The backend's rules: worktrees, draft PRs, green CI, Conventional Commits, labels, pinned versions; worktrees **grouped by theme** | Same habits across both repos, without a worktree per tiny change |
| Styling | `StyleSheet` + theme tokens + `@expo/ui`; no styling framework | No extra dependency to carry through SDK upgrades |
| Libraries | TanStack Query, TanStack Form + zod, i18next (`expo-localization`), `expo-secure-store`, `expo-notifications`, `expo-crypto`, `socket.io-client` | Mirror the backend's web app; Expo modules first |
| Push | Native APNs/FCM tokens to `PUT /v1/devices` | The backend sends through APNs/FCM, not Expo's push service |
| App identity | Placeholders (name, bundle ID, package) | Decide before the first EAS build: the IDs are permanent |
| Package manager | pnpm | As the backend |

## Roadmap

1. **Documentation** (this): AGENTS.md, CLAUDE.md, README, `docs/`,
   `.env.example`.
2. **Foundation:** remove the starter screens; app config (`app.config.ts`,
   env), `eas.json`; `pnpm client:sync` and the client; session with
   single-flight refresh; TanStack Query; i18n with RTL; Prettier with the
   backend's settings, commitlint, CI (lint, typecheck, expo-doctor).
3. **Sign-in:** password, two-factor, sign-up, tenant picker, sign-out.
4. **Account:** profile and language, sessions, passkeys.
5. **Notifications:** list and unread count over realtime, push
   registration, preferences.
6. **Provider sign-in and magic link**, once the backend issue lands.

## Open

- App name, bundle ID, Android package.
- This repo's license (`LICENSE` is still the Expo template's MIT, copyright
  Expo); the copied client is PolyForm Noncommercial 1.0.0, as the backend.
- `.env.example` (`EXPO_PUBLIC_API_URL`): agents may not write `.env*`
  files, so the owner adds it.
- Where the backend is deployed for passkey testing (needs `https`).
