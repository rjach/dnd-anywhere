# Debugging

## Turn on debug logging

Options → Advanced → **Debug logging**. The content script then logs to the page's DevTools console with the prefix `[dnd-anywhere]`:

- `resolved upload targets {targetCount, durationMs, bySource}` on every drag into the window
- `drop {source, kind, files}` (a count, never names)
- `trigger capture {status}` for upload buttons: `captured`, `rejected`, `timeout` or `unavailable`

## Inspect the content script

In Chrome DevTools, the console's context dropdown (top left, "top") lists **DnD Anywhere** as a separate context. Choose it to evaluate code in the isolated world. Sources → Content scripts shows the (unminified) bundles.

## Inspect the overlay

The overlay is a `<dnd-anywhere-overlay>` element at the end of `<html>`, with a closed shadow root. Page scripts can't reach into it, but the DevTools Elements panel shows its contents.

## Common causes

| Symptom                                   | Likely cause                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| No zones at all                           | Page is a browser page, extension is off for the site, or the field doesn't exist until a menu opens   |
| `targetCount: 0`                          | Field is hidden and has no label, nearby button or compact wrapper. Candidate for an adapter.          |
| Zone appears, site ignores the file       | The site checks `isTrusted` or reads files only from its own picker flow. Use "Open file picker".      |
| `trigger capture {status: "timeout"}`     | The button opens a menu or calls something other than `click()`/`showPicker()`                         |
| `trigger capture {status: "unavailable"}` | The MAIN-world shim isn't in that frame (e.g. Firefox < 128, or the frame loaded before the extension) |

## Reproduce with fixtures

`node extension/tests/e2e/server.mjs` serves every fixture at `http://127.0.0.1:4321/` (and a cross-origin copy on port 4322). Load the extension unpacked and try them by hand, or run `pnpm --filter extension e2e:headed`.
