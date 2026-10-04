# Notes to reviewer (Chrome Web Store and Edge)

DnD Anywhere lets users drag and drop files onto upload fields and upload buttons on any website.

How to test (2 minutes):

1. Install, and the welcome page opens. Drag any file from your desktop onto its "Browse…" button; it shows "Received: <file name>".
2. Open https://rjach.github.io/dnd-anywhere/ and drag a file onto the "Try it here" button.
3. Any site with a file upload works too, for example a GitHub issue comment box (which has its own drag and drop, so the extension stays out of the way) or any "Upload" button.

About permissions and code:

- The content script runs on all URLs because upload fields can be on any site. It only registers drag event listeners until files are dragged into the window.
- `content-scripts/capture-shim.js` runs in the MAIN world. It wraps `HTMLElement.prototype.click` / `HTMLInputElement.prototype.showPicker` and passes through unless the user has just dropped files on an upload button; then it gives those files to the file input the page tries to open, instead of showing a dialog.
- The code is intentionally not minified. There are no network requests (CSP `connect-src 'none'` on extension pages), no remote code and no data collection.
- Source: https://github.com/rjach/dnd-anywhere (build: `pnpm install && pnpm zip`).
