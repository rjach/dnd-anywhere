import type { StatusResponse } from "./messages";

/**
 * Plain-text report users paste into bug reports. Contains versions, the page
 * origin and resolver counts only: no URL paths, DOM content or file names.
 */
export function buildDiagnosticReport(
  extensionVersion: string,
  userAgent: string,
  status: StatusResponse | null,
): string {
  const browserVersion = /(Chrome|Firefox|Edg)\/([\d.]+)/.exec(userAgent);
  const lines = [
    "DnD Anywhere diagnostic report",
    `Extension: ${extensionVersion}`,
    `Browser: ${browserVersion ? `${browserVersion[1]} ${browserVersion[2]}` : "unknown"}`,
  ];
  if (!status) {
    lines.push("Page: extension not available on this page");
    return lines.join("\n");
  }
  const sources = Object.entries(status.bySource)
    .map(([source, count]) => `${source}=${count}`)
    .join(", ");
  lines.push(
    `Origin: ${status.origin}`,
    `Active here: ${status.active ? "yes" : "no"} (globally ${status.enabledGlobally ? "on" : "off"})`,
    `Targets: ${status.targetCount}${sources ? ` (${sources})` : ""}`,
    `Resolve time: ${status.durationMs} ms`,
    `Adapters: ${status.adapters.length ? status.adapters.join(", ") : "none"}`,
  );
  return lines.join("\n");
}
