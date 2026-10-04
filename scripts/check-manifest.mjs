// Compares security-relevant manifest fields with a committed snapshot, so a
// permission change can't slip in unnoticed. Update deliberately with --update.
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SNAPSHOT = `${ROOT}extension/manifest.snapshot.json`;
const BROWSERS = ["chrome-mv3", "firefox-mv3"];

function securitySurface(manifest) {
  return {
    permissions: manifest.permissions ?? [],
    optional_permissions: manifest.optional_permissions ?? [],
    host_permissions: manifest.host_permissions ?? [],
    optional_host_permissions: manifest.optional_host_permissions ?? [],
    content_scripts: (manifest.content_scripts ?? []).map((script) => ({
      matches: script.matches,
      js: script.js,
      run_at: script.run_at,
      all_frames: script.all_frames ?? false,
      world: script.world ?? "ISOLATED",
      match_origin_as_fallback: script.match_origin_as_fallback ?? false,
    })),
    content_security_policy: manifest.content_security_policy ?? null,
    web_accessible_resources: manifest.web_accessible_resources ?? [],
    externally_connectable: manifest.externally_connectable ?? null,
  };
}

const current = {};
for (const browser of BROWSERS) {
  try {
    const manifest = JSON.parse(
      await readFile(`${ROOT}extension/.output/${browser}/manifest.json`, "utf8"),
    );
    current[browser] = securitySurface(manifest);
  } catch {
    console.warn(`skipping ${browser}: not built`);
  }
}

if (process.argv.includes("--update")) {
  await writeFile(SNAPSHOT, `${JSON.stringify(current, null, 2)}\n`);
  console.log("Manifest snapshot updated. Explain the permission change in your PR.");
  process.exit(0);
}

const expected = JSON.parse(await readFile(SNAPSHOT, "utf8"));
let failed = false;
for (const [browser, surface] of Object.entries(current)) {
  if (JSON.stringify(surface) !== JSON.stringify(expected[browser])) {
    failed = true;
    console.error(`Manifest security surface changed for ${browser}.`);
    console.error("expected:", JSON.stringify(expected[browser], null, 2));
    console.error("actual:  ", JSON.stringify(surface, null, 2));
  }
}
if (failed) {
  console.error(
    "\nIf intended, run `node scripts/check-manifest.mjs --update` and justify it in the PR.",
  );
  process.exit(1);
}
console.log(`Manifest security surface matches the snapshot (${Object.keys(current).join(", ")}).`);
