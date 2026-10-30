# End-to-end flows (Maestro)

[Maestro](https://maestro.mobile.dev) drives the app like a person: these
flows sign in, open Notes, create and delete a note, and sign out.

Passing on the iOS simulator in Expo Go against a test backend
(2026-10-30). CI runs them only when asked (the `e2e` label). Maestro needs
Java: `brew install openjdk mobile-dev-inc/tap/maestro`, and
`JAVA_HOME=$(brew --prefix openjdk)/libexec/openjdk.jdk/Contents/Home`.

What they learned about the screens:

- A field's visible label is hidden from screen readers (the input carries
  it), so `tapOn: Email` finds the input.
- A list row is named by all its text: match it with a pattern
  (`".*Last used.*"`).
- In Expo Go the floating tools button covers the header's right button;
  the flows open such screens by link. `APP_URL` overrides the project
  URL (`exp://127.0.0.1:8081`), e.g. for a development build.
- The floating tab bar covers the bottom of a screen: scroll with
  `centerElement: true`.

```bash
# Expo Go (or a development build) running the app against a test backend
maestro test .maestro --env EMAIL=you@example.com --env PASSWORD=…
```

Use a test account: each run signs in (and gets a "new sign-in" email).
