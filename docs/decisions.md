# Decisions

Decided 2026-10-29, at the start of the project. Change one by editing it
here, with the reason.

| Topic                        | Decision                                                                                                                                         | Why                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose                      | A public **template**: the mobile starter for projects on the backend template; no product features                                              | Backend users get a matching app start                                                                                                                |
| Repository                   | Separate repo, public, a GitHub template                                                                                                         | Keeps the backend template lean; the mobile app has its own toolchain (Expo, EAS); free Actions minutes                                               |
| API client                   | Copy the backend's `packages/api-client` from a pinned commit of the project's own backend (`pnpm client:sync`)                                  | It isn't published; a copy keeps its errors, pagination and realtime helpers identical, includes the project's own routes, and updates are deliberate |
| Sign-in, first release       | Password, two-factor, sign-up, passkeys                                                                                                          | All work with the backend's token routes today                                                                                                        |
| Provider sign-in, magic link | Wanted, **after a backend change** (token handoff to the app)                                                                                    | Today they end in the web app with a cookie ([backend-integration](backend-integration.md#sign-in-methods))                                           |
| Tenancy                      | Multi-tenant with a picker; skipped with one tenant                                                                                              | Works with `TENANCY=single` too                                                                                                                       |
| Workflow                     | The backend's rules: worktrees, draft PRs, green CI, Conventional Commits, labels, pinned versions; worktrees **grouped by theme**               | Same habits across both repos, without a worktree per tiny change                                                                                     |
| Styling                      | `StyleSheet` + theme tokens + `@expo/ui`; no styling framework                                                                                   | No extra dependency to carry through SDK upgrades                                                                                                     |
| Libraries                    | TanStack Query, TanStack Form + zod, i18next (`expo-localization`), `expo-secure-store`, `expo-notifications`, `expo-crypto`, `socket.io-client` | Mirror the backend's web app; Expo modules first                                                                                                      |
| Push                         | Native APNs/FCM tokens to `PUT /v1/devices`                                                                                                      | The backend sends through APNs/FCM, not Expo's push service                                                                                           |
| App identity                 | Placeholders (name, bundle ID, package), by design                                                                                               | Each project sets its own ([Make it yours](development.md#make-it-yours))                                                                             |
| Captcha                      | No widget in the app; app attestation on the backend (#953)                                                                                      | A WebView widget is fragile, and a plain exemption lets bots around the check                                                                         |
| Languages                    | en, de, ar, zh, ms from the sign-in phase, `pnpm i18n:check` in CI                                                                               | As the backend; RTL tested early                                                                                                                      |
| Telemetry                    | A `track()` facade, off by default, no vendor; only with the account's `analytics` consent, scrubbed                                             | The template can't choose a vendor for every project. No App Tracking Transparency prompt: nothing tracks across apps                                 |
| Package manager              | pnpm                                                                                                                                             | As the backend                                                                                                                                        |
| License                      | PolyForm Noncommercial 1.0.0                                                                                                                     | As the backend; the copied client already carries it                                                                                                  |

## Roadmap

Done (one pull request per group, each issue closed by its PR):
documentation; foundation; sign-in; account and notifications; Notes
example (#10); account lifecycle (#16); record add-ons (#17);
attachments (#18); work surfaces (#19); approvals (#20); developer
experience (#21); platform (#22); quality (#23); documents, export,
branding (#24); telemetry (#25).

Waiting, as GitHub issues:

- **#12** provider and tenant-SSO sign-in: a provider configured on the
  server and the app's redirect in `NATIVE_REDIRECT_URIS`.
- **#13** development build, passkeys, push, app attestation, universal
  links: an Android device or a paid Apple Developer team.
- **#14** release readiness: store accounts.

## Open

- Where the backend is deployed for passkey testing (needs `https`).
- App attestation (backend done, #953): the app side waits for a
  development build with a paid Apple team or Android; meanwhile
  `CAPTCHA_MODE` unset.
- Provider sign-in and magic links (backend done, #952): provider sign-in
  waits for a provider on the test server; magic links for universal/app
  links.
