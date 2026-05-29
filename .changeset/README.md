# Changesets

This folder stores pending release notes created with `npm run changeset`.

Every PR must include a changeset. For changes that intentionally do not release packages (CI, docs, tests, tooling), create an explicit empty changeset:

```sh
npx changeset --empty
```

Do not hand-write empty changeset files. CI runs `changeset status --since=main`, which only recognizes CLI-created changesets.
