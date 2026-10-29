# Adding a feature

The mobile side of the backend's `pnpm feature:add` (backend
`adding-a-feature`). **Notes** is the worked example: copy its shape, rename,
and change only the fields.

## 1. The backend first

Generate and finish the feature in the backend, merge it, then sync the
client here so its routes are typed:

```bash
pnpm client:sync main
pnpm typecheck        # the new paths exist; anything that changed shows here
```

## 2. The files

| File                                 | What it holds (Notes)                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `src/features/<x>/hooks.ts`          | Query keys, list (`useInfiniteQuery`, cursor), one record with its ETag, create/update/delete mutations, `isConflict` |
| `src/features/<x>/<x>-form.tsx`      | The form for create and edit (TanStack Form + zod, API field errors)                                                  |
| `src/app/(app)/<x>/_layout.tsx`      | The tab's stack and its titles                                                                                        |
| `src/app/(app)/<x>/index.tsx`        | List: search (debounced), filters, pull to refresh, paging, empty and error states                                    |
| `src/app/(app)/<x>/new.tsx`          | Create                                                                                                                |
| `src/app/(app)/<x>/[id]/index.tsx`   | Detail, actions per the record's `can`                                                                                |
| `src/app/(app)/<x>/[id]/edit.tsx`    | Edit with `If-Match`                                                                                                  |
| `src/app/(app)/_layout.tsx`          | A tab trigger (Android shows at most 5)                                                                               |
| `src/features/notifications/link.ts` | Its detail path in `APP_ROUTES`, so notification links open it in the app                                             |
| `src/i18n/locales/*.json`            | Its texts in every language (`pnpm i18n:check`)                                                                       |

## 3. The rules the example follows

- **Lists** ask `include=can`, sort newest change first, page by
  `nextCursor`, and send filters as the typed query parameters
  (`q`, `status`, `title.contains`…). Search waits until typing stops
  (`useDebounced`).
- **One record** comes with its **ETag** (`etagOf`). Update and delete send
  it as `If-Match`; a 412 `precondition_failed` means someone else saved
  meanwhile: say so, offer to load their version, never overwrite.
- **Permissions:** what the person may do overall comes from
  `GET /v1/auth/me` → `can['<Subject>.<action>']` (show "New" or not); what
  they may do with one record from its own `can` (`update`, `delete`). The
  API checks again; the UI only hides what would be refused.
- **Cache:** list keys start with the feature (`['notes', 'list', …]`), so
  one `invalidateQueries({ queryKey: ['notes'] })` refreshes them all; an
  update writes the returned record and ETag into its detail key.
- **Errors:** a failed load shows `ErrorState` (retry); a failed action its
  message where it happened; field errors under their fields.
- **Tests** cover the logic that can go wrong without the UI showing it:
  for Notes, that an edit sends `If-Match` and that a 412 is a conflict
  (`src/features/notes/hooks.test.tsx`, with the fake API in `src/test/`).

## 4. Check

```bash
pnpm format && pnpm lint && pnpm typecheck && pnpm i18n:check && pnpm test
```

Then try it on a simulator against your backend: list, search, create,
edit, delete, and an edit after someone else changed the record.
