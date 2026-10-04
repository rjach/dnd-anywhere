# Architecture

DnD Anywhere is a Manifest V3 extension built with [WXT](https://wxt.dev). This document explains how a drag becomes files in a page's upload field, and where each piece lives.

## The big picture

```
Page (each frame)
┌──────────────────────────────────────────────────────────────────────────┐
│ MAIN world, document_start              ISOLATED world, document_idle    │
│ ┌───────────────────────────┐ postMessage ┌────────────────────────────┐ │
│ │ capture-shim              │◀───nonce───▶│ content script             │ │
│ │ wraps click()/showPicker()│             │  DragSession (state machine)│ │
│ │ pass-through unless armed │             │  ResolverChain → targets   │ │
│ └───────────────────────────┘             │  Overlay (closed shadow)   │ │
│                                           │  injector, capture bridge  │ │
│                                           └─────────────┬──────────────┘ │
└─────────────────────────────────────────────────────────┼────────────────┘
                                         storage.sync     │ runtime messages
              ┌───────────────────────┐  ┌────────────────┴───────┐
              │ popup / options /     │  │ background service     │
              │ welcome pages         │  │ worker: welcome tab on │
              │ (Preact)              │  │ install, "off" badge   │
              └───────────────────────┘  └────────────────────────┘
```

| Path                                                      | Responsibility                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `extension/entrypoints/content.ts`                        | Loads settings, starts the runtime, answers the popup, reports the badge |
| `extension/entrypoints/capture-shim.content.ts`           | MAIN-world shim (see [trigger capture](#trigger-capture))                |
| `extension/entrypoints/background.ts`                     | Opens the welcome page on install; sets the per-tab "off" badge          |
| `extension/src/content/runtime.ts`                        | Wires session, overlay, chain and capture bridge for one frame           |
| `extension/src/core/session.ts`                           | `DragSession`: drag events, hit testing, delivering files                |
| `extension/src/core/resolvers/`                           | Strategies that find drop targets                                        |
| `extension/src/core/injector.ts`                          | Puts files into an input the way a file dialog does                      |
| `extension/src/core/capture-bridge.ts`, `capture-shim.ts` | Trigger capture protocol, both sides                                     |
| `extension/src/core/accept.ts`                            | Parsing and matching `accept`                                            |
| `extension/src/ui/overlay/`                               | Drop zones and toasts                                                    |
| `extension/src/settings/`                                 | Settings schema, validation, migrations, storage                         |
| `extension/src/adapters/`                                 | Per-site adapters                                                        |

`src/core` never touches `chrome.*` directly. Its dependencies (window, document, storage, clock, shadow-root access) are passed in, so it runs under Vitest + happy-dom.

## Lifecycle of a drag

1. **Idle.** The content script has registered a handful of `drag*` listeners on `window`. No DOM scanning, no observers, no timers.
2. **`dragenter` with files** (`dataTransfer.types` includes `"Files"`). The session checks the settings and the per-site switch, then runs the resolver chain once. No targets, or turned off: the session goes **inert** for this drag and does nothing else.
3. **Active.** A `requestAnimationFrame` loop reads each anchor's bounding rect (all reads first, then writes to our own overlay) and renders zones. Zones that can't accept the dragged MIME types are dimmed.
4. **`dragover`.** Listened to twice:
   - capture phase: provisionally assume the page handles this event;
   - bubble phase (after page handlers): if the page already called `preventDefault()`, the page has its own drag and drop here, so we step aside, unless the force modifier (Alt by default) is held. Otherwise we hit-test the pointer against zone rects (smallest zone wins; small controls get a 48×48 hit area), cancel the event and set `dropEffect` to `copy`, or to `none` when no usable zone is under the pointer. Using `none` also stops a stray drop from navigating away from a half-filled form.
5. **`drop`** (capture phase, before the page sees it). If the last decision was ours, we cancel the event, stop propagation, and deliver the files.
6. **Leaving.** `dragleave` with `relatedTarget === null` ends the session after 100 ms unless another `dragover` arrives. A 1-second watchdog ends it if `dragover` events stop (for example, the drag was cancelled outside the window).

The overlay is drawn with `pointer-events: none` and hit testing is done by coordinates, so it never steals events from the page.

## Resolvers

Resolvers implement one interface (`Resolver` in `src/core/types.ts`) and run in priority order. File inputs are collected once per drag from the document and every reachable shadow root, then shared.

| #   | Resolver                | Finds                                                                                         |
| --- | ----------------------- | --------------------------------------------------------------------------------------------- |
| 1   | `SiteAdapterResolver`   | Targets from adapters whose URL patterns match                                                |
| 2   | `VisibleInputResolver`  | Rendered `<input type=file>`                                                                  |
| 3   | `LabelledInputResolver` | Hidden inputs, anchored to a rendered `<label>`, the only nearby button, or a compact wrapper |
| 4   | `ShadowInputResolver`   | The same for inputs inside shadow roots                                                       |
| 5   | `TriggerResolver`       | Buttons whose wording or attributes say "upload" (≈15 languages)                              |
| 6   | `PageFallbackResolver`  | Optional: the whole page, if it has exactly one upload field                                  |

`ResolverChain` removes duplicates: an input claimed by an earlier resolver is skipped, and a zone overlapping an existing one is dropped. This is why a styled button wrapping a hidden input becomes one zone, not two.

Field names come from `aria-label`, `aria-labelledby`, `<label>`, `title` or `name`. If that gives generic action text such as "Browse…", the nearest preceding caption ("Resume") is used instead.

Safety rules in `TriggerResolver`: it never targets links that navigate or buttons that would submit a form, because it clicks them on the user's behalf.

## Delivering files

**Inputs** (`kind: "input"`): files are filtered by `accept` (when strict), checked against `multiple`, and assigned through a `DataTransfer`, followed by bubbling `input` and `change` events, the same sequence a file dialog produces. If the input was hidden and the page shows no DOM change within 1.5 s, the toast offers the real picker.

### Trigger capture

Many widgets create a file input inside a click handler and call `input.click()` or `input.showPicker()`; the input is never in the DOM before that. To handle them:

1. At `document_start`, the MAIN-world shim wraps `HTMLElement.prototype.click` and `HTMLInputElement.prototype.showPicker` with Proxies that pass straight through.
2. On a drop over a trigger, the isolated script posts `arm` (with the files and a fresh nonce) and waits for `armed`.
3. It clicks the trigger. The page's handler runs and asks for a file picker.
4. The armed wrapper intercepts that one request: instead of opening a dialog it assigns the files (filtered by that input's `accept`/`multiple`), fires `input`/`change` asynchronously like a real picker, and replies `captured`.
5. If nothing asks for a picker within 1 s, the bridge sends `disarm` and the toast offers **Click it for me**, which clicks the button with the user's real activation so the normal picker opens.

Files cross worlds through `window.postMessage`, which structured-clones `File` objects. See [ADR 0003](adr/0003-trigger-capture-in-main-world.md) and the [security model](security-model.md).

## Shadow DOM and iframes

- Open shadow roots are walked directly. Closed shadow roots are reached with `chrome.dom.openOrClosedShadowRoot()` (Firefox: `element.openOrClosedShadowRoot()`), which content scripts can call without a permission. See [ADR 0004](adr/0004-closed-shadow-roots-via-dom-api.md).
- Content scripts run in every frame (`all_frames`, `match_origin_as_fallback`). Each frame handles drags over itself; no cross-frame coordination is needed. The per-site switch uses the top-level origin (`location.ancestorOrigins`), so turning a site off covers its iframes.

## Overlay

`Overlay` mounts a `<dnd-anywhere-overlay>` element with a **closed** shadow root and `all: initial`, shown as a manual popover so it sits in the top layer above the page's modal dialogs. It exists only while zones or toasts are visible. Toasts are announced through an `aria-live="polite"` region and pause on hover or focus.

## Pages

The popup, options and welcome pages are Preact apps. The welcome page runs the same content runtime directly (content scripts don't run on extension pages) to provide a live demo. The popup talks to the top frame's content script with `tabs.sendMessage` to show the page's status; it never needs the `tabs` permission.

## Settings

`src/settings/schema.ts` defines the settings, their defaults, and `normalizeSettings()`, which turns anything (stored data, imported files) into valid settings and runs migrations. Bump `SETTINGS_VERSION` and add a migration step when the shape changes.

## Budgets

| What                                      | Budget  | Enforced by                     |
| ----------------------------------------- | ------- | ------------------------------- |
| `dragenter` → targets resolved, 50 inputs | < 16 ms | `tests/e2e/performance.spec.ts` |
| Content script size (gzipped, unminified) | ≤ 24 KB | `scripts/check-bundle-size.mjs` |
| Capture shim size (gzipped)               | ≤ 5 KB  | same                            |
| Work on idle pages                        | none    | design; reviewed in PRs         |
