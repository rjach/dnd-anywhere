# 0002. Content scripts on all URLs instead of per-site opt-in

- Status: Accepted
- Date: 2026-10-04

## Context

Upload fields can be on any site. Options:

1. Content scripts declared for `<all_urls>`. Works everywhere immediately. Triggers the "read and change all your data on all websites" warning and a longer store review.
2. `optional_host_permissions` plus per-site grants (or `activeTab`). Smaller warning, but the user must click the toolbar button on every new site before dragging, which defeats the purpose.

## Decision

Option 1, with mitigations: the script is idle until files are dragged into the window, makes no network requests (CI-enforced), stores nothing about pages, and can be turned off per site or globally. The store listing and welcome page explain the warning in plain words.

## Consequences

- Longer first review on the Chrome Web Store; reviewer notes and readable builds help.
- If reviews or users push back, a "privacy mode" build with per-site opt-in can be added later as a separate listing without changing the core (`src/core` doesn't know how it was injected).
