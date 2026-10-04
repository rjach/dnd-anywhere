import { defineConfig } from "wxt";

const HOMEPAGE = "https://rjach.github.io/dnd-anywhere/";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: ".",
  entrypointsDir: "entrypoints",
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: "__MSG_extName__",
    description: "__MSG_extDescription__",
    default_locale: "en",
    homepage_url: HOMEPAGE,
    permissions: ["storage"],
    action: { default_title: "__MSG_actionTitle__" },
    content_security_policy: {
      // connect-src 'none' makes "no network requests" hold for extension pages.
      extension_pages: "script-src 'self'; object-src 'self'; connect-src 'none'",
    },
    ...(browser === "firefox" && {
      browser_specific_settings: {
        gecko: {
          id: "dnd-anywhere@rjach.github.io",
          // MAIN-world content scripts need Firefox 128.
          strict_min_version: "128.0",
          data_collection_permissions: { required: ["none"] },
        },
      },
    }),
  }),
  zip: {
    artifactTemplate: "dnd-anywhere-{{version}}-{{browser}}.zip",
    sourcesTemplate: "dnd-anywhere-{{version}}-sources.zip",
    sourcesRoot: "..",
    excludeSources: [
      "PLAN.md",
      "**/node_modules/**",
      "**/.output/**",
      "**/.wxt/**",
      "site/**",
      "store/**",
      "**/test-results/**",
      "**/playwright-report/**",
      "**/coverage/**",
    ],
  },
  vite: () => ({
    oxc: { jsx: { runtime: "automatic", importSource: "preact" } },
    build: {
      // Readable output helps store reviewers and users who audit the extension.
      minify: false,
      sourcemap: false,
      // The polyfill uses fetch(); every supported browser preloads modules natively.
      modulePreload: { polyfill: false },
    },
  }),
});
