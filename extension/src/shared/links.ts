export const REPOSITORY_URL = "https://github.com/rjach/dnd-anywhere";
export const HOMEPAGE_URL = "https://rjach.github.io/dnd-anywhere/";
export const PRIVACY_URL = `${HOMEPAGE_URL}privacy/`;

/**
 * GitHub issue form for a broken site, prefilled with the origin only. Never pass
 * a full URL here: paths and query strings can contain private data.
 *
 * @param origin - Page origin, e.g. "https://example.com"
 * @param version - Extension version for the report
 */
export function siteReportUrl(origin: string, version: string): string {
  const params = new URLSearchParams({
    template: "site_not_working.yml",
    title: `Site not working: ${safeHost(origin)}`,
    site: origin,
    version,
  });
  return `${REPOSITORY_URL}/issues/new?${params.toString()}`;
}

function safeHost(origin: string): string {
  try {
    return new URL(origin).host || origin;
  } catch {
    return origin;
  }
}
