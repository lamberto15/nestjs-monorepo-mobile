# Development

## Setup

1. Node 24 (the backend's `.nvmrc`) and pnpm.
2. `pnpm install`
3. `cp .env.example .env.local` and fill it (below).
4. The backend running locally: in its repo, `pnpm setup` once, then
   `pnpm dev` (API on <http://localhost:3000>).
5. `pnpm start`, then `i` (iOS simulator), `a` (Android emulator), or scan
   the QR code.

Expo Go works until the first library with native code that it doesn't
bundle (passkeys, push credentials); from then on, use a development build:
`pnpm ios` / `pnpm android` (`expo run:*`, [on your own
iPhone](#on-your-own-iphone-free)), or
`pnpm dlx eas-cli build --profile development`.

## On your own iPhone, free

A development build on your phone with a free Apple ID (no paid Developer
Program). Once, on the Mac and the phone:

1. Xcode → Settings → Accounts → **+** → Apple ID (a "Personal Team"). If
   a build later says the login was rejected, sign in there again.
2. iPhone: Settings → Privacy & Security → **Developer Mode** on (it
   restarts); connect it by cable and **Trust** the Mac. Afterwards Xcode
   reaches it over the same Wi-Fi (Window → Devices and Simulators).
3. The first build creates the signing profile, which `expo run` doesn't
   allow on its own: `pnpm ios --device` once to generate `ios/`, then
   open `ios/*.xcworkspace`, target → Signing & Capabilities →
   **Automatically manage signing**, your Personal Team, and run it from
   Xcode (or `pnpm ios --device` again).
4. iPhone: Settings → General → **VPN & Device Management** → your Apple
   ID → **Trust**, then open the app. It loads the code from `pnpm start`.

`pnpm ios` / `pnpm android` build and install (`expo run:*`); `pnpm start`
alone serves Expo Go or a build already installed. The free signature
expires after **7 days** (build again). A free team can't sign Push or
Associated Domains, so no push, passkeys or universal links (#13).

## Make it yours

After creating your repo from this template:

- [ ] `APP_ID` in `.env.local` and each EAS environment (e.g.
      `dev.example.app`): the iOS bundle ID and Android package, set by
      `app.config.ts`; **permanent after the first store upload**. `app.json`:
      `name`, `slug`, `scheme`. `app.name` in
      `src/i18n/locales/`.
- [ ] Icons and splash in `assets/`, colors in `src/constants/theme.ts`.
- [ ] `client-sync.json`: your backend repository, then `pnpm client:sync main`
      ([backend-integration](backend-integration.md#the-typed-client)).
- [ ] EAS: `pnpm dlx eas-cli init` (your project ID), environments and
      their `EXPO_PUBLIC_API_URL`.
- [ ] Backend: `PUSH_PROVIDER` (APNs/FCM keys), `PASSKEY_APPLE_APPS` and
      `PASSKEY_ANDROID_APPS` with your IDs.
- [ ] `LICENSE` for your app.

## Environment

| Variable              | What                                                                        |
| --------------------- | --------------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_URL` | The API's base URL, no trailing slash                                       |
| `EXPO_PUBLIC_WEB_URL` | The web app's origin: notification links open there (optional)              |
| `APP_ID`              | iOS bundle ID and Android package (`app.config.ts`); empty: the placeholder |

`EXPO_PUBLIC_*` variables are **inlined into the bundle**: never put a
secret in one. For EAS builds, set them per environment in EAS
(`development`, `preview`, `production`), not in a committed file.

## Reaching the local API

`localhost` on a phone or emulator is the device itself, not your computer:

| Where the app runs        | `EXPO_PUBLIC_API_URL`                  |
| ------------------------- | -------------------------------------- |
| iOS simulator, web        | `http://localhost:3000`                |
| Android emulator          | `http://10.0.2.2:3000`                 |
| A real phone (same Wi-Fi) | `http://<your computer's LAN IP>:3000` |

Native requests have no CORS; the web target does: add its origin to the
backend's `CORS_ORIGINS`. Passkeys need `https` and the RP ID's host: test
them against a deployed backend or a tunnel, not plain LAN HTTP.

## Checks

```bash
pnpm format:check    # Prettier, the backend's settings (pnpm format fixes)
pnpm lint            # expo lint (ESLint)
pnpm typecheck
pnpm i18n:check      # every language has en.json's keys and placeholders
pnpm test            # Jest (jest-expo); tests sit next to the code: *.test.ts
pnpm test:scripts    # the repo scripts' own tests (node --test)
pnpm client:check    # src/api/client matches its pinned commit
pnpm dlx expo-doctor
```

CI (`.github/workflows/ci.yml`) runs them on every pull request and push to
`main`, then bundles iOS and Android (`expo export`), and checks the pull
request's title is a Conventional Commit. `pnpm install` installs the git
hooks (lefthook): commitlint on each commit message, Prettier on staged
files.

pnpm runs dependencies' install scripts only when `allowBuilds` in
`pnpm-workspace.yaml` says so: lefthook's (installs the hooks) is allowed;
`unrs-resolver`'s (ESLint's resolver, prebuilt binaries already arrive as
optional dependencies) is not.

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

## QA pass

Before a release, and after a change to shared components: open the UI
catalogue (Home → "UI catalogue", development builds only) and the changed
screens with the simulator in each of:

```bash
xcrun simctl ui booted appearance dark            # and light
xcrun simctl ui booted content_size accessibility-extra-large   # and large (default)
```

and once in Arabic (Account → Language, then reopen the app: right to
left). Look for text that clips or breaks mid-word, contrast (the
accessibility rules in docs/architecture.md), and controls a screen reader
can't name. Found by the first pass: a picture served by the API needs
the token (`ApiImage`); rows stack at the largest text sizes.

## End-to-end and preview builds

- **Maestro flows** in `.maestro/` (sign in, create and delete a note,
  sign out); see its README. Maestro needs Java (`brew install openjdk`).
- **Preview builds:** label a pull request `preview` (or run the "Preview
  build" workflow) to build the preview profile with EAS; it needs an
  `EXPO_TOKEN` secret and `eas init` done, and is skipped without them.

## Store privacy answers

What the template itself collects, for App Store "App Privacy" and Google
Play "Data safety" (a project adds what its features collect):

| Data                                                              | Why                             | Where                       |
| ----------------------------------------------------------------- | ------------------------------- | --------------------------- |
| Email, name, password (never stored on the device)                | Sign-in, the account            | The project's API           |
| Profile picture (optional)                                        | The account                     | The project's API           |
| Content the person creates (notes, comments, files, photos taken) | The app's purpose               | The project's API           |
| Device name and model in the User-Agent                           | Sessions and new-sign-in alerts | The project's API           |
| Push token (once push is added, #13)                              | Notifications                   | The project's API, APNs/FCM |

No tracking, no third-party analytics or ads (`NSPrivacyTracking: false`).
Data is encrypted in transit (HTTPS); the account can be deleted in the app
(Account → Delete account) and its data exported (Account → Your data).

## Builds and releases (EAS)

`eas.json` has three profiles, each reading its EAS environment's
variables: `development` (a development build, internal distribution),
`preview` (internal, update channel `preview`) and `production` (store,
channel `production`, build numbers kept and bumped by EAS:
`appVersionSource: remote`). Set `EXPO_PUBLIC_API_URL` in each EAS
environment. Over-the-air updates (`eas update`) need `expo-updates`, added
when a project first ships. The template ships no EAS
project ID and placeholder IDs: each project sets its own
([Make it yours](#make-it-yours)).
