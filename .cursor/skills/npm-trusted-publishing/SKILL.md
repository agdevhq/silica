---
name: npm-trusted-publishing
description: Configure npm OIDC trusted publishing for Silica packages so GitHub Actions can publish without tokens. Use when adding a new publishable package, setting up npm trusted publishing, or when release CI fails to publish due to missing trust configuration.
---

# npm Trusted Publishing (Silica)

Silica publishes from GitHub Actions via OIDC trusted publishing. Each package must trust the release workflow individually.

## Silica configuration

| Setting         | Value                               |
| --------------- | ----------------------------------- |
| GitHub org/repo | `agdevhq/silica`                    |
| Workflow file   | `release.yml`                       |
| Environment     | _(leave empty — workflow has none)_ |
| Permission      | `publish`                           |

Workflow: `.github/workflows/release.yml` (requires `id-token: write`, no `NODE_AUTH_TOKEN`).

## Prerequisites

1. Package is already published to npm at least once (trust cannot be configured for unpublished packages).
2. User is logged in: `npm whoami`
3. npm 11.16+ (needs `--allow-publish` flag)
4. Account 2FA enabled — first trust operation requires browser auth

## Configure one package

```bash
npm trust github <package-name> \
  --repo agdevhq/silica \
  --file release.yml \
  --allow-publish \
  --yes
```

Examples:

```bash
npm trust github @silicajs/new-package --repo agdevhq/silica --file release.yml --allow-publish --yes
npm trust github create-silica --repo agdevhq/silica --file release.yml --allow-publish --yes
```

If prompted, complete 2FA in the browser. Enable **skip 2FA for 5 minutes** when offered so bulk runs don't re-prompt.

## Configure multiple packages

```bash
for pkg in @silicajs/auth @silicajs/cli create-silica; do
  npm trust github "$pkg" --repo agdevhq/silica --file release.yml --allow-publish --yes
  sleep 2
done
```

## Verify

```bash
npm trust list <package-name>
```

Expected output includes:

```
type: github
file: release.yml
repository: agdevhq/silica
permissions: publish
```

## When adding a new package

1. Publish the package (initial manual publish or first CI release after trust is set up).
2. Run the trust command for that package.
3. Verify with `npm trust list`.

## Troubleshooting

| Error                           | Meaning              | Action                                            |
| ------------------------------- | -------------------- | ------------------------------------------------- |
| `EOTP`                          | 2FA required         | User completes browser auth, then retry           |
| `E400`                          | Invalid request      | Ensure `--allow-publish` is set and npm is 11.16+ |
| `E409`                          | Trust already exists | Run `npm trust list` — likely already configured  |
| `No trust configurations found` | Not configured       | Run configure command                             |

The agent cannot complete browser 2FA. Run the first `npm trust` command in the user's terminal if auth is needed, then the agent can run remaining packages.
