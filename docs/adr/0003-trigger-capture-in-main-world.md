# 0003. Trigger capture through a MAIN-world shim

- Status: Accepted
- Date: 2026-10-04

## Context

Many upload widgets have no file input in the DOM. Their button's click handler creates one and calls `input.click()` or `input.showPicker()`. Content scripts in the isolated world can't intercept calls made by page code, because each world has its own prototypes.

Alternatives: `chrome.debugger` to synthesize trusted input and handle the file chooser (heavy permission, shows a warning banner); asking users to click first (not drag and drop); site adapters for every widget (doesn't scale).

## Decision

A small script in the MAIN world at `document_start` wraps `HTMLElement.prototype.click` and `HTMLInputElement.prototype.showPicker` with Proxies that pass through unless armed. After a drop on a trigger, the isolated script arms it over `postMessage` (with the files and a nonce), clicks the trigger, and the next picker request is answered with the dropped files instead of a dialog. Arming is short-lived and single-use.

## Consequences

- Works for the common "create input on click" pattern with no extra permissions.
- The page can observe the wrappers and our messages; this grants it nothing it couldn't do already (see the security model).
- Sites that require a trusted click, or open a menu first, won't capture; the UI falls back to "Click it for me".
- `showOpenFilePicker` (File System Access API) is not covered yet.
