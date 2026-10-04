// Static server for E2E fixtures. Listens on two ports so iframe tests get a real
// cross-origin frame (different port = different origin).
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const FIXTURES = fileURLToPath(new URL("../fixtures/", import.meta.url));
const VENDOR = { "/vendor/vue.js": require.resolve("vue/dist/vue.global.prod.js") };
const TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
};
const PORTS = [
  Number(process.env.FIXTURE_PORT ?? 4321),
  Number(process.env.FIXTURE_PORT ?? 4321) + 1,
];

function resolvePath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  if (VENDOR[pathname]) return VENDOR[pathname];
  const file = normalize(join(FIXTURES, pathname === "/" ? "plain.html" : pathname));
  return file.startsWith(FIXTURES) ? file : null;
}

for (const port of PORTS) {
  createServer((request, response) => {
    const file = resolvePath(request.url ?? "/");
    if (!file || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(response);
  }).listen(port, "127.0.0.1", () => console.log(`fixtures on http://127.0.0.1:${port}`));
}
