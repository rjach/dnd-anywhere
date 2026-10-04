// Fails if the built extension contains code that could make network requests.
// DnD Anywhere promises zero network access; this keeps that promise checkable.
// False positives go in scripts/network-allowlist.json (changes need maintainer review).
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_DIRS = ["extension/.output/chrome-mv3", "extension/.output/firefox-mv3"];
const FORBIDDEN = [
  { name: "fetch()", pattern: /\bfetch\s*\(/ },
  { name: "XMLHttpRequest", pattern: /\bXMLHttpRequest\b/ },
  { name: "WebSocket", pattern: /\bWebSocket\b/ },
  { name: "sendBeacon", pattern: /\bsendBeacon\b/ },
  { name: "EventSource", pattern: /\bEventSource\b/ },
  { name: "remote importScripts", pattern: /importScripts\s*\(\s*["'`]https?:/ },
  { name: "remote script/link URL", pattern: /<(script|link)[^>]+(src|href)=["']https?:/i },
  { name: "eval", pattern: /\beval\s*\(/ },
  { name: "new Function", pattern: /\bnew\s+Function\s*\(/ },
];

const allowlist = JSON.parse(await readFile(join(ROOT, "scripts/network-allowlist.json"), "utf8"));

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (/\.(m?js|html)$/.test(entry.name)) yield path;
  }
}

const violations = [];
let scanned = 0;
for (const outputDir of OUTPUT_DIRS) {
  const absolute = join(ROOT, outputDir);
  try {
    await readdir(absolute);
  } catch {
    continue;
  }
  for await (const file of walk(absolute)) {
    scanned += 1;
    const source = await readFile(file, "utf8");
    const lines = source.split("\n");
    for (const { name, pattern } of FORBIDDEN) {
      lines.forEach((line, index) => {
        if (!pattern.test(line)) return;
        const path = relative(ROOT, file);
        const allowed = allowlist.some(
          (entry) => path.endsWith(entry.file) && line.includes(entry.contains),
        );
        if (!allowed)
          violations.push(`${path}:${index + 1}  ${name}\n    ${line.trim().slice(0, 160)}`);
      });
    }
  }
}

if (scanned === 0) {
  console.error("No build output found. Run `pnpm build` first.");
  process.exit(1);
}
if (violations.length > 0) {
  console.error(
    `Network or dynamic-code use found in the extension bundle:\n\n${violations.join("\n")}`,
  );
  console.error(
    "\nIf this is a false positive, add it to scripts/network-allowlist.json with a reason.",
  );
  process.exit(1);
}
console.log(`No network or dynamic-code calls in ${scanned} built files.`);
