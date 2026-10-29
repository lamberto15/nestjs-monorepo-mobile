# End-to-end flows (Maestro)

[Maestro](https://maestro.mobile.dev) drives the app like a person: these
flows sign in, open Notes, create and delete a note, and sign out.

> **Not yet run.** Written against the screens' texts (English) and not
> executed in this repository so far: Maestro needs Java, and CI runs it
> only when asked (the `e2e` label). Run them once and fix what they find.

```bash
# Expo Go (or a development build) running the app against a test backend
maestro test .maestro --env EMAIL=you@example.com --env PASSWORD=…
```

Use a test account: each run signs in (and gets a "new sign-in" email).
