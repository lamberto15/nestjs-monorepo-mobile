# AGENTS.md

A **starter mobile app** (Expo, React Native, Expo Router) for projects built
on [nestjs-monorepo-template](https://github.com/lamberto15/nestjs-monorepo-template),
a NestJS REST backend. Prioritize mobile-first patterns, performance, and
cross-platform compatibility (iOS, Android; web only as a dev convenience).

**This is a template.** It holds what every app on the backend needs
(client, session, sign-in, tenants, notifications), not product features.
Names and IDs stay placeholders; keep live hostnames, account identifiers,
signing data and credentials out of the repository.

<!--
Maintainers: this file is the source of truth for every coding agent.
CLAUDE.md imports it and holds only Claude-specific settings.
Keep this file short: every line here is paid for in every session.
-->

## How to work

- **Follow the code that's there.** Find the closest existing example and
  match its shape. Custom code only when nothing fits, with a comment saying
  why.
- **Smallest change that does the task.** No new layer, generic helper,
  option or flag until a second real caller needs it.
- **The backend is the contract.** Use the typed client in
  `src/api/client/` (copied, never hand-edited:
  [docs/backend-integration.md](docs/backend-integration.md)). If the app
  needs something the API doesn't offer, file an issue on the backend repo
  instead of working around it here.
- **Tests prove the change, nothing else.** A fix gets one test that fails
  without it.
- **Spend tokens like money.** Search before reading; open only the doc the
  task needs (Map below).

## Owner's rules (always apply)

- **Never edit `main`: work goes through a worktree, grouped by theme.**
  One branch and worktree (`.claude/worktrees/<name>`) per cohesive group of
  work (a phase, a feature, a set of related fixes), not one per tiny change.
  Each group gets a pull request to `origin` and green CI; then the worktree
  is removed and the PR squash-merged with its branch deleted. Never rebase
  or force-push: update a branch with `git merge origin/main`.
  [docs/development.md](docs/development.md), "Git workflow".
- **Open a draft PR early and use CI for validation.** Keep it draft until
  ready; merge only on green CI, after checking every check run and review
  comment.
- **Conventional Commits** (`feat`, `fix`, `docs`, `refactor`, `test`,
  `build`, `ci`, `chore`…), for commits and PR titles.
- **Label every pull request:** `frontend` (app code), `ci`,
  `documentation`, `dependencies`, plus `enhancement` or `bug`. Add a
  missing label with `gh label create`. Put `Closes #<n>` in the
  description when it works an issue.
- **Generate, never hand-write what a command produces:** dependencies
  (`pnpm expo install`), the API client (`pnpm client:sync`), native
  folders (Continuous Native Generation).
- **Newest versions, pinned** (never `latest`).
- **`.env*` files are not written by agents:** the owner copies
  `.env.example`. Keep `.env.example` complete when adding a variable.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely
renamed, moved, or removed. Before writing any code that touches an Expo,
EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all
   Expo docs with corrections to common LLM misconceptions. Follow its links
   to the specific page you need; never answer from memory.

## Commands

This project uses **pnpm** (`pnpm-lock.yaml`).

```bash
pnpm expo install <package>  # ALWAYS instead of pnpm add: SDK-compatible versions
pnpm start                   # dev server
pnpm lint                    # expo lint
pnpm typecheck               # tsc --noEmit
pnpm format                  # Prettier (format:check in CI)
pnpm client:sync [<ref>]     # copy the backend's typed client (client-sync.json)
pnpm dlx expo-doctor         # diagnose dependency and config issues
pnpm expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done. Run EAS CLI as
`pnpm dlx eas-cli <command>` (substitute it for bare `eas` in docs).

## Navigation & Routing

- **Expo Router** for all navigation. Routes live in `src/app/`: every file
  there is a screen, `_layout.tsx` files define navigators. Keep non-route
  code (components, hooks, API, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Rules

- `ios/` and `android/` are generated (Continuous Native Generation). Never
  create or edit them by hand: configure native behavior in the app config
  and config plugins.
- Expo Go only includes its bundled native modules. After adding a library
  with native code, the app needs a development build
  (`pnpm expo run:ios|android`, or `eas build --profile development`).
- Prefer Expo modules over third-party libraries. Styling: the theme tokens
  in `src/constants/theme.ts` and `@expo/ui`; no styling framework.
- Secrets (tokens) only in `expo-secure-store`, never AsyncStorage or logs.

## Map

Everything is in `docs/`. Read the one the task needs.

- `architecture`: folders, layers, state, navigation, styling.
- `backend-integration`: the API client and its sync, tokens and refresh,
  sign-in methods, tenants, errors, push, realtime, languages.
- `development`: setup, env, running against a local backend, builds, git
  workflow.
- `decisions`: what was chosen and why.

Backend docs (read on GitHub, `docs/<name>.md` in the backend repo): `auth`,
`api-conventions`, `tenancy`, `notifications`, `webhooks-and-realtime`,
`i18n-and-time`, `branding`.
