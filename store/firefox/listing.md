# Firefox Add-ons (AMO) listing

Package: `dnd-anywhere-<version>-firefox.zip`. Source: `dnd-anywhere-<version>-sources.zip` (required because the code is bundled).

- **Name:** DnD Anywhere
- **Add-on URL slug:** dnd-anywhere
- **Summary (max 250):** Drag and drop files onto any upload field or button on any website. Free, open source, no data collection and no network requests.
- **Description:** same as `../chrome/listing.md`, with "Firefox" for browser names
- **Categories:** Other; Productivity
- **Support email:** hello@rojanacharya.com
- **Support site:** https://rjach.github.io/dnd-anywhere/support/
- **Homepage:** https://rjach.github.io/dnd-anywhere/
- **License:** MIT
- **Privacy policy:** paste the text of https://rjach.github.io/dnd-anywhere/privacy/
- **Data collection:** the manifest declares `data_collection_permissions: { required: ["none"] }`
- **Minimum Firefox version:** 128 (MAIN-world content scripts)

## Notes to reviewer

Build instructions (Node.js 22.12+):

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm --filter extension exec wxt zip -b firefox
```

Output: `extension/.output/dnd-anywhere-<version>-firefox.zip`. The build is not minified, so the output can be compared file by file with the uploaded package.

The MAIN-world script (`content-scripts/capture-shim.js`) wraps `click()`/`showPicker()` and passes through unless the user just dropped files on an upload button; see `docs/architecture.md#trigger-capture` in the source.
