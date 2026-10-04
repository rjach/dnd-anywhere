import { build } from "esbuild";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

/** Bundles the React fixture and checks the extension was built before tests run. */
export default async function globalSetup(): Promise<void> {
  const extension = fileURLToPath(
    new URL("../../.output/chrome-mv3/manifest.json", import.meta.url),
  );
  if (!existsSync(extension))
    throw new Error("Build the extension first: pnpm --filter extension build:chrome");
  await build({
    entryPoints: [fileURLToPath(new URL("../fixtures/react/app.tsx", import.meta.url))],
    outfile: fileURLToPath(new URL("../fixtures/react/dist/app.js", import.meta.url)),
    bundle: true,
    format: "iife",
    jsx: "automatic",
    // The extension's tsconfig targets Preact; this fixture is a real React app.
    jsxImportSource: "react",
    tsconfigRaw: {},
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
  });
}
