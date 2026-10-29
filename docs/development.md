# Development

## Setup

1. Node 24 (the backend's `.nvmrc`) and pnpm.
2. `pnpm install`
3. `cp .env.example .env` and fill it (below).
4. The backend running locally: in its repo, `pnpm setup` once, then
   `pnpm dev` (API on <http://localhost:3000>).
5. `pnpm start`, then `i` (iOS simulator), `a` (Android emulator), or scan
   the QR code.

Expo Go works until the first library with native code that it doesn't
bundle (passkeys, push credentials); from then on, use a development build:
`pnpm expo run:ios` / `run:android`, or
`pnpm dlx eas-cli build --profile development`.

## Environment

| Variable | What |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | The API's base URL, no trailing slash |

`EXPO_PUBLIC_*` variables are **inlined into the bundle**: never put a
secret in one. For EAS builds, set them per environment in EAS
(`development`, `preview`, `production`), not in a committed file.

## Reaching the local API

`localhost` on a phone or emulator is the device itself, not your computer:

| Where the app runs | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| iOS simulator, web | `http://localhost:3000` |
| Android emulator | `http://10.0.2.2:3000` |
| A real phone (same Wi-Fi) | `http://<your computer's LAN IP>:3000` |

Native requests have no CORS; the web target does: add its origin to the
backend's `CORS_ORIGINS`. Passkeys need `https` and the RP ID's host: test
them against a deployed backend or a tunnel, not plain LAN HTTP.

## Checks

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm dlx expo-doctor
```

CI (planned) runs the same on every pull request.

## Git workflow

`main` is never edited directly. Work is **grouped by theme**: one branch
and worktree per cohesive group (a phase, a feature, a set of related
fixes), not one per small change.

1. `git fetch origin`, then
   `git worktree add --no-track -b <type>/<name> .claude/worktrees/<name> origin/main`
   (`.claude/worktrees/` is in `.git/info/exclude`). Push with
   `git push -u origin HEAD`.
2. Commit in Conventional Commits; open a **draft PR** after the first
   reviewable commit, labeled ([AGENTS.md](../AGENTS.md)); push as you go so
   CI runs.
3. Green CI and every check reviewed, then mark it ready.
4. Remove the worktree (`git worktree remove .claude/worktrees/<name>`),
   then from the main checkout
   `gh pr merge <number> --squash --delete-branch`.

Update a branch with `git merge origin/main`; never rebase or force-push.

## Builds and releases (EAS)

Planned in phase 2: `eas.json` with `development`, `preview` and
`production` profiles, EAS environments for the variables, and
`eas update` for over-the-air JavaScript updates. The bundle ID and package
name are **placeholders** until decided ([decisions](decisions.md)): they
can't change after the first store upload.
