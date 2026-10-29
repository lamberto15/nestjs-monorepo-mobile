# nestjs-monorepo-mobile

A **starter mobile app** for projects built on
[nestjs-monorepo-template](https://github.com/lamberto15/nestjs-monorepo-template):
Expo (SDK 58), React Native and Expo Router, already wired to the
template's REST API and realtime socket through its typed client. Start your
iOS and Android app from it the way you started your backend from the
template.

> Status: **foundation**. What's built and what's next:
> [docs/decisions.md](docs/decisions.md#roadmap).

## What the starter gives you (planned)

- Sign in with email and password, two-factor (TOTP or a recovery code), and
  passkeys; sign-up when the backend allows it.
- Token sessions done right: secure storage, refresh before expiry, one
  refresh at a time (the backend revokes a reused refresh token's family).
- Tenant picker and switching.
- Profile, language (incl. right to left), sessions and devices.
- Notifications: the in-app list kept live over realtime, and push
  (APNs/FCM, as the backend sends).

No product features: add yours on top.

## Use it

1. **Use this template** on GitHub (or clone it) for your app's repo.
2. Make it yours: the checklist in
   [docs/development.md](docs/development.md#make-it-yours) (app name,
   bundle ID and package, scheme, your backend repo for the client sync).
3. Run it against your backend:

   ```bash
   pnpm install
   cp .env.example .env    # set EXPO_PUBLIC_API_URL
   pnpm start              # i: iOS simulator, a: Android emulator, or scan the QR code
   ```

Prerequisites: Node 24 and pnpm (as the backend), and the backend running
(its `pnpm dev`, API on port 3000). A phone or emulator can't reach
`localhost` on your computer: see
[docs/development.md](docs/development.md#reaching-the-local-api).

## Documentation

| Doc | What's in it |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Rules for coding agents (and people): workflow, commands, Expo rules |
| [docs/architecture.md](docs/architecture.md) | Folders, layers, state, navigation, styling |
| [docs/backend-integration.md](docs/backend-integration.md) | API client sync, tokens, sign-in, tenants, errors, push, realtime |
| [docs/development.md](docs/development.md) | Setup, make it yours, env, dev builds, EAS, git workflow |
| [docs/decisions.md](docs/decisions.md) | Decisions and the roadmap |

## License

[PolyForm Noncommercial 1.0.0](LICENSE), as the backend template.
