# Adding a site adapter

The generic resolvers handle most upload controls. An **adapter** is a small, hand-written rule for one site they miss: an upload area with no file input until a menu opens, a custom component, wording our heuristics don't catch.

Adapters are bundled with the extension. They are never downloaded at runtime: browser stores forbid remote code, and so do our [privacy rules](../CONTRIBUTING.md#privacy-rules).

## Before you start

1. Check the generic behavior first: turn on **Debug logging** in Options, drag a file over the page, and read the `[dnd-anywhere] resolved upload targets` line in the page console. It lists how many targets each resolver found.
2. Make sure an adapter is the right fix. If the problem is general (for example, a common button wording in your language), improve the resolver instead; that helps every site.
3. Open or find an issue for the site, so others know you're on it.

## 1. Add a fixture

Create `extension/tests/fixtures/adapter-<site>.html` that reproduces the relevant markup. Keep it minimal and **never copy private content** from the real site. Include a `#result` element that shows what the page received, like the other fixtures.

## 2. Write the adapter

Create `extension/src/adapters/<site>.ts`:

```ts
import { inputTarget, triggerTarget } from "../core/resolvers/shared";
import type { SiteAdapter } from "./types";

export const exampleComAdapter: SiteAdapter = {
  id: "example-com",
  description: "Attachment drawer whose input only exists inside a closed component",
  matches: [/^https:\/\/(www\.)?example\.com\//],
  resolve({ document, getShadowRoot }) {
    const host = document.querySelector("attachment-drawer");
    const input =
      host && getShadowRoot(host)?.querySelector<HTMLInputElement>('input[type="file"]');
    if (!host || !input) return [];
    return [inputTarget(input, host, "adapter", { label: "Attachments" })];
  },
};
```

Rules:

- **Read only.** Don't modify the page in `resolve()`.
- **Be cheap.** `resolve()` runs on every `dragenter`. Use specific selectors; don't walk the whole DOM.
- **Return nothing when unsure.** Generic resolvers still run after you.
- Use `triggerTarget(button, label)` for buttons that open a picker on click.
- Anchor to the element the user sees, so the zone is drawn where they expect it.

Register it in `extension/src/adapters/index.ts`:

```ts
import { exampleComAdapter } from "./example-com";

export const SITE_ADAPTERS: readonly SiteAdapter[] = [exampleComAdapter];
```

## 3. Test it

- **Unit test** in `extension/tests/unit/adapters/<site>.test.ts`: build the DOM with `html()`, run `createDefaultChain([yourAdapter]).resolve(context())`, and assert on targets. Give elements a size with `data-rect`.
- **E2E test** (optional): your adapter's URL pattern won't match the local fixture server, so test the adapter's logic in unit tests (where you can pass it to `createDefaultChain([adapter])` with any URL). Use E2E only if the fix also changes generic behavior.

Run `pnpm test` and `pnpm e2e`.

## 4. Open the PR

Title: `feat(adapter): support uploads on example.com`. In the description, say which control was missed and how you verified it on the real site (origin only, no private URLs).

Adapters are reviewed like any other code, with extra care for selectors that could match unrelated elements on the site.
