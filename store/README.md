# Store listings

Source of truth for everything submitted to the extension stores. Change listing text here in a PR, then copy it into each dashboard.

| Folder                | Contents                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------- |
| `chrome/`             | Chrome Web Store listing, privacy practices answers, reviewer notes                      |
| `edge/`               | Microsoft Edge Add-ons listing                                                           |
| `firefox/`            | Firefox Add-ons (AMO) listing and reviewer notes                                         |
| `assets/screenshots/` | 1280×800 screenshots (generated)                                                         |
| `assets/promo/`       | Small tile 440×280, marquee 1400×560, Open Graph 1200×630, Edge logo 300×300 (generated) |
| `assets/source/`      | Icon SVGs and the showcase page used for screenshots                                     |

Regenerate screenshots and promo art from the real extension:

```sh
pnpm --filter extension store:assets
```

## Live listings

| Store            | ID                                 | Status   |
| ---------------- | ---------------------------------- | -------- |
| Chrome Web Store | `incaomgmnnlenfbijijpjngndegcnmae` | Approved |
| Edge Add-ons     | not submitted                      |          |
| Firefox AMO      | not submitted                      |          |

## Shared listing facts

- **Name:** DnD Anywhere
- **Homepage:** https://rjach.github.io/dnd-anywhere/
- **Support:** https://rjach.github.io/dnd-anywhere/support/
- **Privacy policy:** https://rjach.github.io/dnd-anywhere/privacy/
- **Terms:** https://rjach.github.io/dnd-anywhere/terms/
- **Source code:** https://github.com/rjach/dnd-anywhere
- **Contact:** hello@rojanacharya.com
- **Category:** Productivity (Chrome: "Tools" or "Workflow & Planning"; Edge: "Productivity"; Firefox: "Other" / "Productivity")
- **Price:** free, no in-app purchases, no ads
