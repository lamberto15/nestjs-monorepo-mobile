# nestjs-monorepo-mobile

A **starter mobile app** for projects built on
[nestjs-monorepo-template](https://github.com/lamberto15/nestjs-monorepo-template):
Expo (SDK 58), React Native and Expo Router, already wired to the
template's REST API and realtime socket through its typed client. Start your
iOS and Android app from it the way you started your backend from the
template.

> Status: **foundation**. What's built and what's next:
> [docs/decisions.md](docs/decisions.md#roadmap).

## What the starter gives you

- **Sessions done right:** the typed API client synced from your backend,
  tokens in the secure store, one refresh at a time (the backend revokes a
  reused refresh token's family), step-up for sensitive actions.
- **Sign-in:** password, two-factor, sign-up, forgot password; tenants,
  switched any time.
- **Account:** profile and picture, language (five, Arabic right to left),
  security (two-factor, password, an optional Face ID / fingerprint lock),
  sessions of browsers and apps, your data and consents, account deletion.
- **Work:** Home with what waits on you, favorites and recents; global
  search; approvals and acknowledgments; notifications live over realtime,
  with settings and quiet hours.
- **Records:** an example feature (Notes) with search, filters from the
  API, saved views, ETag conflicts, custom fields; comments with mentions,
  tags, watching, history, files from the camera, PDFs, CSV export, who
  else is looking; `pnpm feature:add` copies it for your own features.
- **Platform:** an encrypted offline cache of what was viewed, iPad two-column Notes, offline handling, timeouts, error states, accessibility
  (WCAG AA colours), the tenant's branding, a privacy cover, the iOS
  privacy manifest, consent-gated telemetry (off by default).
- **Quality:** tests, CI, a weekly client drift check, a UI catalogue,
  Maestro flows, EAS preview builds.

Waiting on accounts or devices (see the open issues): provider sign-in and
magic links, passkeys, push, app attestation, store releases.

No product features: add yours on top (docs/adding-a-feature.md).

## Use it

1. **Use this template** on GitHub (or clone it) for your app's repo.
2. Make it yours: the checklist in
   [docs/development.md](docs/development.md#make-it-yours) (app name,
   bundle ID and package, scheme, your backend repo for the client sync).
3. Run it against your backend:

   ```bash
   pnpm install
   cp .env.example .env.local    # set EXPO_PUBLIC_API_URL
   pnpm start              # i: iOS simulator, a: Android emulator, or scan the QR code
   ```

Prerequisites: Node 24 and pnpm (as the backend), and the backend running
(its `pnpm dev`, API on port 3000). A phone or emulator can't reach
`localhost` on your computer: see
[docs/development.md](docs/development.md#reaching-the-local-api).

## Documentation

| Doc                                                        | What's in it                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)                                     | Rules for coding agents (and people): workflow, commands, Expo rules |
| [docs/architecture.md](docs/architecture.md)               | Folders, layers, state, navigation, styling                          |
| [docs/backend-integration.md](docs/backend-integration.md) | API client sync, tokens, sign-in, tenants, errors, push, realtime    |
| [docs/development.md](docs/development.md)                 | Setup, make it yours, env, dev builds, EAS, git workflow             |
| [docs/adding-a-feature.md](docs/adding-a-feature.md)       | Adding a feature: the Notes example and its rules                    |
| [docs/decisions.md](docs/decisions.md)                     | Decisions and the roadmap                                            |

## License

[PolyForm Noncommercial 1.0.0](LICENSE), as the backend template.
