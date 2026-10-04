# Contributing to DnD Anywhere

Thanks for helping. This guide covers how to set up the project, what we expect in a pull request, and the few rules that keep the extension trustworthy.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to help

- **Report a site that doesn't work.** Use the toolbar button's "Report this site" link, or the [site report form](https://github.com/rjach/dnd-anywhere/issues/new?template=site_not_working.yml). This is the most useful thing you can do.
- **Write a site adapter** for a site the generic logic misses. See [docs/adding-a-site-adapter.md](docs/adding-a-site-adapter.md). Good first contribution.
- **Translate** the UI: copy `extension/public/_locales/en/messages.json` to your locale folder (for example `_locales/de/`) and translate the `message` values. Keep placeholders like `$COUNT$` as they are.
- **Fix bugs** labeled [`good first issue`](https://github.com/rjach/dnd-anywhere/labels/good%20first%20issue) or [`help wanted`](https://github.com/rjach/dnd-anywhere/labels/help%20wanted).
- **Improve docs** and the website.

For anything bigger than a small fix, open an issue or discussion first so we can agree on the approach.

## Development setup

You need Node.js 22.12 or newer and pnpm through Corepack:

```sh
corepack enable
git clone https://github.com/rjach/dnd-anywhere.git
cd dnd-anywhere
pnpm install
```

| Command                               | What it does                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------ |
| `pnpm dev`                            | Opens Chrome with the extension loaded and reloads it on changes               |
| `pnpm --filter extension dev:firefox` | Same, in Firefox                                                               |
| `pnpm test`                           | Unit tests (Vitest + happy-dom)                                                |
| `pnpm --filter extension coverage`    | Unit tests with coverage gates                                                 |
| `pnpm e2e`                            | Builds, then runs Playwright against the fixture pages with the real extension |
| `pnpm lint` / `pnpm format`           | ESLint and Prettier                                                            |
| `pnpm typecheck`                      | TypeScript for the extension and site                                          |
| `pnpm check`                          | Build plus every CI guard (network, manifest, size, licenses)                  |
| `pnpm site:dev`                       | The landing page at `http://localhost:4321/dnd-anywhere/`                      |

The first `pnpm e2e` run needs a browser: `pnpm --filter extension exec playwright install chromium`.

## Project tour

```
extension/
  entrypoints/       WXT entry points: content script, MAIN-world capture shim, background, popup, options, welcome
  src/core/          resolvers (find upload targets), drag session (state machine), injector, capture bridge
  src/adapters/      per-site adapters
  src/ui/overlay/    drop zones and toasts, rendered in a closed shadow root
  src/settings/      settings schema, validation and storage
  tests/unit/        Vitest tests
  tests/e2e/         Playwright tests
  tests/fixtures/    one HTML page per scenario (hidden input, shadow DOM, iframes, React, Vue…)
site/                Astro website, privacy policy and terms
store/               store listing text and assets
docs/                architecture, security model, guides, ADRs
scripts/             CI guards
```

Start with [docs/architecture.md](docs/architecture.md).

## Coding standards

- **TypeScript, strict.** No `any` unless there's no alternative, with a comment explaining why.
- **Small, focused functions** with names that say what they do. Prefer early returns.
- **Comments explain why**, not what. Exported functions get a short JSDoc.
- **No magic values.** Name constants (timeouts, sizes, limits).
- **Dependencies are injected** in `src/core` (DOM, storage, clock) so it stays testable without browser APIs.
- **No new runtime dependencies in the content script** without discussion. It runs on every page; every kilobyte counts. The size budget is checked in CI.
- **User-facing text goes through `t()`** and `messages.json`, never hard-coded.

Prettier formats everything; run `pnpm format` before committing.

## Privacy rules

These are non-negotiable, and PRs that break them will be closed:

1. **No network requests** from the extension: no `fetch`, XHR, WebSocket, beacons, remote scripts, fonts or images.
2. **No analytics, telemetry or tracking** of any kind, including "anonymous" usage counts.
3. **No remote code or remote configuration.** Adapters ship inside the extension.
4. **No `eval` or `new Function`.**
5. **Never log or report** file names, file contents, page content or full URLs in diagnostics.

CI enforces the first and fourth with `scripts/check-no-network.mjs` and ESLint.

## Permission changes

Any change to manifest permissions, host access, content script matches, `world`, or CSP needs an issue and maintainer agreement **before** the PR. CI compares the manifest with `extension/manifest.snapshot.json`; update it with `node scripts/check-manifest.mjs --update` and explain why in the PR. Permission changes affect store review and users' trust, so the bar is high.

## Tests

- Logic changes need unit tests. `src/core` must stay above the coverage thresholds in `extension/vitest.config.ts`.
- New resolver behavior or a new adapter needs a **fixture page** in `extension/tests/fixtures/` and an E2E test in `extension/tests/e2e/`.
- happy-dom has no layout engine. In unit tests, give elements a size with `data-rect="x,y,width,height"` (see `tests/unit/setup.ts`).

## Commits and pull requests

- We use [Conventional Commits](https://www.conventionalcommits.org/): `feat: …`, `fix: …`, `docs: …`, `test: …`, `refactor: …`, `chore: …`. PRs are squash-merged, so the **PR title** must follow this format (CI checks it). It becomes the changelog entry.
- **Sign off your commits** under the [Developer Certificate of Origin](https://developercertificate.org/): `git commit -s`. This adds `Signed-off-by: Your Name <email>` and certifies you have the right to submit the work. The DCO app checks every PR. There is no CLA.
- One concern per PR. Small PRs get reviewed faster.
- Fill in the PR template, including how you tested.
- Don't bump versions or edit `CHANGELOG.md`; [release-please](docs/release-process.md) does that.

## Getting help

Ask in [GitHub Discussions](https://github.com/rjach/dnd-anywhere/discussions). For security issues, follow [SECURITY.md](SECURITY.md) instead of opening an issue.
