# nestjs-monorepo-mobile

The iOS and Android app of
[nestjs-monorepo-template](https://github.com/lamberto15/nestjs-monorepo-template):
Expo (SDK 58), React Native, Expo Router, talking to the template's REST API
and realtime socket through its typed client.

> Status: **foundation**. The plan is in [docs/decisions.md](docs/decisions.md#roadmap).

## What it does (planned first release)

- Sign in with email and password, two-factor (TOTP or a recovery code), and
  passkeys; sign up when the backend allows it.
- Pick and switch tenants (organizations).
- Profile, language, sessions and devices.
- Notifications: the in-app list kept live over realtime, and push (APNs/FCM).

## Quick start

Prerequisites: Node 24 (as the backend's `.nvmrc`), pnpm, and the backend
running locally (its `pnpm dev`, API on port 3000).

```bash
pnpm install
cp .env.example .env    # then set EXPO_PUBLIC_API_URL
pnpm start              # press i (iOS simulator), a (Android emulator), or scan the QR code
```

A phone or emulator can't reach `localhost` on your computer: see
[docs/development.md](docs/development.md#reaching-the-local-api).

## Documentation

| Doc | What's in it |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Rules for coding agents (and people): workflow, commands, Expo rules |
| [docs/architecture.md](docs/architecture.md) | Folders, layers, state, navigation, styling |
| [docs/backend-integration.md](docs/backend-integration.md) | API client sync, tokens, sign-in, tenants, errors, push, realtime |
| [docs/development.md](docs/development.md) | Setup, env, dev builds, EAS, git workflow |
| [docs/decisions.md](docs/decisions.md) | Decisions and the roadmap |

## License

Not decided yet: `LICENSE` is still the Expo template's
([decisions](docs/decisions.md#open)). The copied API client in
`src/api/client/` keeps the backend's license (PolyForm Noncommercial 1.0.0).
