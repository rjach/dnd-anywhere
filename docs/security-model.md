# Security and privacy model

## Assets we protect

1. **Users' files.** They must only reach the upload field the user dropped them on.
2. **Users' browsing.** The extension runs on every page; it must not observe, record or leak anything about those pages.
3. **Page integrity.** Running on every site must not break sites or change their behavior when the user isn't dragging files.
4. **Users' trust in the build.** What's in the store must be what's in this repository.

## Trust boundaries

| Boundary                                    | What crosses it                                 | Rule                                                                                                |
| ------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Web page ↔ isolated content script          | DOM reads; synthetic events we dispatch         | We read structure only. We write only our overlay host and the `files` of the input the user chose. |
| Isolated script ↔ MAIN-world shim           | `postMessage` with files and a nonce            | The page can see and send these messages too (see below).                                           |
| Content script ↔ extension pages/background | `runtime` messages: status request, badge state | Messages are validated with `isRuntimeMessage`; responses contain no page content.                  |
| Extension ↔ network                         | nothing                                         | No network APIs; enforced in CI and by CSP `connect-src 'none'` on extension pages.                 |

## Permissions

- `storage`: settings only.
- Content scripts on `<all_urls>` in all frames, isolated world at `document_idle` and MAIN world at `document_start`. This is what makes the "read and change all your data on all websites" warning appear. Alternatives were considered in [ADR 0002](adr/0002-all-urls-content-scripts.md).
- No `tabs`, `scripting`, `webRequest`, `downloads`, `clipboardRead`, `debugger` or `activeTab`. The manifest's security surface is snapshotted (`extension/manifest.snapshot.json`) and checked in CI.

## Threats and mitigations

| Threat                                                  | Mitigation                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A page forges `arm` messages to the MAIN-world shim     | The shim validates payloads (real `File` objects, bounded timeout) but cannot authenticate the sender: the page shares the MAIN world. A forged `arm` only lets the page put **its own** `File` objects into **its own** input, which it can already do with `DataTransfer`. No privilege is gained. |
| A page reads files from our `arm` message               | The message is posted to the page that is about to receive the files anyway, right after the user dropped them on its button. Nothing is sent to other origins: `postMessage` targets the same window.                                                                                               |
| A page spoofs `armed`/`captured` replies                | Worst case, we show a wrong toast or click a button the user dropped onto. Replies must echo the nonce of an in-flight request.                                                                                                                                                                      |
| A page detects the extension through wrapped prototypes | Accepted. The wrappers are Proxies, so `name`, `length` and `Function.prototype.toString` look native, but determined pages can detect most extensions. Out of scope.                                                                                                                                |
| Clicking a trigger causes side effects                  | `TriggerResolver` never targets navigating links, disabled controls, or buttons that would submit a form. Triggers are styled as guesses ("Try dropping here"), and capture is a setting.                                                                                                            |
| Files land in a lookalike field                         | Zones show the field's name, and drops go only to the zone under the pointer (smallest wins).                                                                                                                                                                                                        |
| Capture stays armed and swallows a later picker         | Arming lasts at most 1 s (bridge) and is capped at 5 s (shim), is consumed by the first picker request, and is explicitly disarmed on timeout.                                                                                                                                                       |
| The overlay is styled or scripted by the page           | Closed shadow root, `all: initial`, `!important` host styles. The page can remove our host element; that only hides our UI.                                                                                                                                                                          |
| Leaking page data through diagnostics                   | Reports contain versions, origin and counts only. Debug logs never include file names or DOM text (enforced in review; see `src/shared/logger.ts`). The "Report this site" link pre-fills the origin only, after confirmation.                                                                       |
| Supply chain                                            | Lockfile with `--frozen-lockfile` in CI, Dependabot, actions pinned to commit SHAs, one runtime dependency (Preact, pages only; the content script has none), license check, OpenSSF Scorecard, build provenance attestations.                                                                       |
| Malicious code slipping into a release                  | CODEOWNERS review for workflows, manifest and scripts; `store-publish` environment approval; readable (unminified) output; reproducible release instructions.                                                                                                                                        |

## Non-goals

- Hiding the extension's presence from pages.
- Protecting users from sites they choose to upload files to.
- Defending against a compromised browser or OS.

## Reporting

See [SECURITY.md](../SECURITY.md).
