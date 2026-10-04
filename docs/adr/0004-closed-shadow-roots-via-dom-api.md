# 0004. Reach closed shadow roots with the extension DOM API

- Status: Accepted
- Date: 2026-10-04

## Context

Some component libraries put file inputs in closed shadow roots. The original plan was to wrap `Element.prototype.attachShadow` in the MAIN world to record closed roots. That touches a sensitive API on every page, and the isolated world can't read MAIN-world variables without another messaging channel.

## Decision

Use `chrome.dom.openOrClosedShadowRoot(element)` in Chrome and `element.openOrClosedShadowRoot()` in Firefox. Both are available to content scripts without a permission. The lookup is done only during a drag and can be turned off in Options.

## Consequences

- No `attachShadow` patching; less page interference.
- Resolving walks every element once per drag to find shadow hosts. Measured at a few milliseconds on large pages (see the performance test).
