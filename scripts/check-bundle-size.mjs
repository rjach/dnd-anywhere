// Enforces size budgets for scripts injected into every page. We ship readable,
// unminified code for reviewers, so budgets are for that output (gzipped).
import { readFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BUDGETS = [
  { file: "extension/.output/chrome-mv3/content-scripts/content.js", maxGzipKb: 24 },
  { file: "extension/.output/chrome-mv3/content-scripts/capture-shim.js", maxGzipKb: 5 },
];

let failed = false;
for (const { file, maxGzipKb } of BUDGETS) {
  const source = await readFile(`${ROOT}${file}`);
  const gzipKb = gzipSync(source, { level: 9 }).length / 1024;
  const status = gzipKb <= maxGzipKb ? "ok  " : "FAIL";
  if (gzipKb > maxGzipKb) failed = true;
  console.log(
    `${status} ${file}: ${(source.length / 1024).toFixed(1)} KB raw, ${gzipKb.toFixed(1)} KB gzip (budget ${maxGzipKb} KB)`,
  );
}
process.exit(failed ? 1 : 0);
