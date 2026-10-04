// Generates store screenshots, promo tiles and the site's Open Graph image from the
// real built extension. Run `pnpm --filter extension store:assets`.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const EXTENSION = `${ROOT}extension/.output/chrome-mv3`;
const OUT = `${ROOT}store/assets`;
const SIZE = { width: 1280, height: 800 };

const showcase = await readFile(`${OUT}/source/showcase.html`, "utf8");
const icon = await readFile(`${OUT}/source/icon.svg`, "utf8");
const server = createServer((_req, res) =>
  res.writeHead(200, { "content-type": "text/html" }).end(showcase),
);
await new Promise((resolve) => server.listen(4455, "127.0.0.1", resolve));

const context = await chromium.launchPersistentContext("", {
  channel: "chromium",
  viewport: SIZE,
  deviceScaleFactor: 1,
  args: [`--disable-extensions-except=${EXTENSION}`, `--load-extension=${EXTENSION}`],
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const extensionId = new URL(worker.url()).host;

/** Fires a synthetic file drag at the centre of `selector`, optionally dropping. */
async function drag(page, selector, files, drop) {
  await page.evaluate(
    async ({ selector, files, drop }) => {
      const element = document.querySelector(selector);
      const rect = element.getBoundingClientRect();
      const point = { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 };
      const transfer = new DataTransfer();
      for (const [name, type] of files) transfer.items.add(new File(["x"], name, { type }));
      const fire = (type) =>
        element.dispatchEvent(
          new DragEvent(type, {
            bubbles: true,
            cancelable: true,
            dataTransfer: transfer,
            ...point,
          }),
        );
      fire("dragenter");
      fire("dragover");
      await new Promise((resolve) => setTimeout(resolve, 100));
      fire("dragover");
      if (drop) fire("drop");
    },
    { selector, files, drop },
  );
}

/** Keeps the drag alive (the session ends after 1 s without dragover) while we screenshot. */
async function holdDrag(page, selector, files) {
  await drag(page, selector, files, false);
  await page.evaluate((selector) => {
    const element = document.querySelector(selector);
    const rect = element.getBoundingClientRect();
    const transfer = new DataTransfer();
    transfer.items.add(new File(["x"], "resume.pdf", { type: "application/pdf" }));
    setInterval(() => {
      element.dispatchEvent(
        new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
        }),
      );
    }, 200);
  }, selector);
  await page.waitForTimeout(300);
}

const page = await context.newPage();
await page.goto("http://127.0.0.1:4455/");
await holdDrag(page, "label[for=resume]", [["resume.pdf", "application/pdf"]]);
await page.screenshot({ path: `${OUT}/screenshots/1-drop-zones.png` });

await page.reload();
await drag(page, "label[for=resume]", [["resume.pdf", "application/pdf"]], true);
await drag(
  page,
  "#samples",
  [
    ["moodboard.png", "image/png"],
    ["wireframes.png", "image/png"],
  ],
  true,
);
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/screenshots/2-dropped.png` });

const options = await context.newPage();
await options.goto(`chrome-extension://${extensionId}/options.html`);
await options.waitForTimeout(300);
await options.screenshot({ path: `${OUT}/screenshots/3-options.png` });

const welcome = await context.newPage();
await welcome.goto(`chrome-extension://${extensionId}/welcome.html`);
await welcome.waitForTimeout(300);
await welcome.screenshot({ path: `${OUT}/screenshots/4-welcome.png` });
await context.close();
server.close();

// Promo art is plain HTML rendered at exact store sizes.
const browser = await chromium.launch();
const promo = (width, height, scale) => `<!doctype html><html><head><style>
  html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden}
  body{display:flex;align-items:center;gap:${36 * scale}px;padding:0 ${64 * scale}px;box-sizing:border-box;
    background:radial-gradient(circle at 85% 20%,#3b82f6 0,#1d4ed8 45%,#172554 100%);color:#fff;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
  svg{width:${150 * scale}px;height:${150 * scale}px;flex:none;filter:drop-shadow(0 ${10 * scale}px ${24 * scale}px rgba(0,0,0,.35))}
  h1{margin:0;font-size:${54 * scale}px;letter-spacing:-.03em;line-height:1.05}
  p{margin:${12 * scale}px 0 0;font-size:${Math.max(13, 22 * scale)}px;opacity:.88;line-height:1.3;max-width:${560 * scale}px}
</style></head><body>${icon}<div><h1>DnD Anywhere</h1><p>Drag and drop files into any upload button, on any website.</p></div></body></html>`;
const tiles = [
  { file: `${OUT}/promo/small-tile-440x280.png`, width: 440, height: 280, scale: 0.42 },
  { file: `${OUT}/promo/marquee-1400x560.png`, width: 1400, height: 560, scale: 1.2 },
  { file: `${OUT}/promo/og-1200x630.png`, width: 1200, height: 630, scale: 1.05 },
  { file: `${ROOT}site/public/og.png`, width: 1200, height: 630, scale: 1.05 },
];
for (const tile of tiles) {
  const tab = await browser.newPage({ viewport: { width: tile.width, height: tile.height } });
  await tab.setContent(promo(tile.width, tile.height, tile.scale));
  await tab.screenshot({ path: tile.file });
  await tab.close();
}
const logo = await browser.newPage({ viewport: { width: 300, height: 300 } });
await logo.setContent(
  `<style>html,body{margin:0;background:transparent}svg{width:300px;height:300px;display:block}</style>${icon}`,
);
await logo.screenshot({ path: `${OUT}/promo/edge-logo-300x300.png`, omitBackground: true });
await browser.close();
console.log("store assets written to store/assets/ and site/public/og.png");
