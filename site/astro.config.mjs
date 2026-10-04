import { defineConfig } from "astro/config";

// GitHub Pages project site: https://rjach.github.io/dnd-anywhere/
export default defineConfig({
  site: "https://rjach.github.io",
  base: "/dnd-anywhere",
  trailingSlash: "always",
  build: { format: "directory" },
  security: {
    // Emits a CSP <meta> with hashes for Astro's own scripts and styles.
    // GitHub Pages can't set response headers, so this is the only CSP we get.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'none'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ],
    },
  },
});
