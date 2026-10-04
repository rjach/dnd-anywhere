# Release process

Releases are automated with [release-please](https://github.com/googleapis/release-please) and published by `.github/workflows/publish.yml`.

## Versioning

- [SemVer](https://semver.org). `feat:` bumps minor, `fix:` bumps patch, `feat!:` or `BREAKING CHANGE:` bumps major.
- One version for the whole repo, kept in `.release-please-manifest.json` and written to `package.json`, `extension/package.json` and `site/package.json`. WXT copies `extension/package.json`'s version into the manifest.
- Chrome only accepts numeric versions (`1.2.3`). Pre-releases set `version_name` in the manifest for display while keeping `version` numeric.

## Cutting a release

1. Merge PRs with Conventional Commit titles into `main`.
2. release-please opens or updates a **release PR** with the version bump and `CHANGELOG.md`.
3. Before merging it, run the [manual test checklist](manual-test-checklist.md) for minor and major releases.
4. Merge the release PR. release-please tags `vX.Y.Z` and publishes a GitHub release.
5. `publish.yml` runs:
   - tests, then `pnpm zip` → `dnd-anywhere-X.Y.Z-{chrome,edge,firefox}.zip` and `dnd-anywhere-X.Y.Z-sources.zip`
   - network, manifest and size guards
   - a [build provenance attestation](https://docs.github.com/en/actions/security-guides/using-artifact-attestations-to-establish-provenance-for-builds) for every zip
   - uploads the zips to the GitHub release
   - after a maintainer approves the `store-publish` environment, submits to each store whose secrets are configured
6. Watch the store dashboards for review results. If a store rejects the build, fix forward with a patch release.

To test the pipeline without submitting: Actions → Publish → Run workflow with **dry-run** checked.

## Store secrets

Configure these in the `store-publish` environment (Settings → Environments), with required reviewers:

| Store            | Secrets                                                                                   |
| ---------------- | ----------------------------------------------------------------------------------------- |
| Chrome Web Store | `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`, `CHROME_REFRESH_TOKEN` |
| Edge Add-ons     | `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY`                                       |
| Firefox AMO      | `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`                        |

See the [publish-browser-extension docs](https://github.com/aklinker1/publish-browser-extension) for how to obtain each one. The **first** submission to each store is done by hand through its dashboard (listing text and assets live in [`store/`](../store/)); automation handles updates.

Optionally add `RELEASE_PLEASE_TOKEN` (a fine-grained token with contents and pull-request write access) so CI runs on release PRs.

## Verifying a release

Anyone can check that a release zip was built by this repository's workflow:

```sh
gh attestation verify dnd-anywhere-1.2.3-chrome.zip --repo rjach/dnd-anywhere
```

And rebuild it from source:

```sh
git checkout v1.2.3
corepack enable
pnpm install --frozen-lockfile
pnpm zip
# compare the files inside extension/.output/dnd-anywhere-1.2.3-chrome.zip with the store version
```

The output is not minified, so diffs are readable.

## Firefox source submission

AMO requires source code for bundled extensions. The `-sources.zip` contains everything needed; reviewers build with:

```sh
corepack enable && pnpm install --frozen-lockfile && pnpm --filter extension exec wxt zip -b firefox
```

(Node.js 22.12+; the output is `extension/.output/dnd-anywhere-<version>-firefox.zip`.)
