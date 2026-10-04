// Renders the SVG sources in store/assets/source to the PNG sizes the manifest needs.
// Run with `node scripts/generate-icons.mjs` after changing an icon source.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sources = {
  large: await readFile(`${root}store/assets/source/icon.svg`, "utf8"),
  small: await readFile(`${root}store/assets/source/icon-small.svg`, "utf8"),
};
const outputs = [
  { size: 16, source: "small" },
  { size: 32, source: "small" },
  { size: 48, source: "large" },
  { size: 96, source: "large" },
  { size: 128, source: "large" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { size, source } of outputs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${sources[source]}`,
  );
  await page.screenshot({
    path: `${root}extension/public/icon/${size}.png`,
    omitBackground: true,
  });
}
await browser.close();
console.log("icons written to extension/public/icon/");
