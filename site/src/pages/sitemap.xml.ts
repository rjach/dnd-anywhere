import type { APIRoute } from "astro";

const PAGES = ["", "privacy/", "terms/", "support/", "changelog/"];

export const GET: APIRoute = ({ site }) => {
  const base = new URL("/dnd-anywhere/", site);
  const urls = PAGES.map(
    (path) => `  <url><loc>${new URL(path, base).toString()}</loc></url>`,
  ).join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { "Content-Type": "application/xml" } });
};
