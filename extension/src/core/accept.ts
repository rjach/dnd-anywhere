import type { AcceptRule } from "./types";

/**
 * Common extension → MIME pairs. During a drag the browser exposes MIME types but not
 * file names, so extension-only rules (".pdf") need this to judge a drag before the drop.
 */
const EXTENSION_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".heic": "image/heic",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".json": "application/json",
  ".zip": "application/zip",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

/** Reverse lookup so "application/pdf" can be shown as "PDF". */
const MIME_EXTENSION: Record<string, string> = Object.fromEntries(
  Object.entries(EXTENSION_MIME).map(([extension, mime]) => [mime, extension]),
);

const WILDCARD_LABELS: Record<string, string> = {
  "image/*": "images",
  "video/*": "videos",
  "audio/*": "audio",
  "text/*": "text files",
};

/** Result of matching dragged MIME types (no names yet) against rules. */
export type DragAcceptance = "accepted" | "rejected" | "unknown";

/**
 * Parses an `accept` attribute into rules. An empty or missing attribute means "anything".
 *
 * @param attribute - Raw `accept` attribute value, e.g. `"image/*,.pdf"`
 * @returns Parsed rules; empty array when every file is allowed
 */
export function parseAccept(attribute: string | null | undefined): AcceptRule[] {
  if (!attribute) return [];
  const rules: AcceptRule[] = [];
  for (const raw of attribute.split(",")) {
    const token = raw.trim().toLowerCase();
    if (!token) continue;
    if (token.startsWith(".")) rules.push({ kind: "extension", value: token });
    else if (token.endsWith("/*")) rules.push({ kind: "wildcard", value: token });
    else if (token.includes("/")) rules.push({ kind: "mime", value: token });
  }
  return rules;
}

function mimeMatches(mime: string, rule: AcceptRule): boolean {
  if (rule.kind === "mime") return mime === rule.value;
  if (rule.kind === "wildcard") return mime.startsWith(rule.value.slice(0, -1));
  return EXTENSION_MIME[rule.value] === mime;
}

/**
 * Checks a dropped file against `accept` rules, using both its name and its MIME type.
 *
 * @param file - The file (or anything with a name and type)
 * @param rules - Rules from {@link parseAccept}
 * @returns True when the file is allowed
 */
export function fileMatchesAccept(file: Pick<File, "name" | "type">, rules: AcceptRule[]): boolean {
  if (rules.length === 0) return true;
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return rules.some((rule) => {
    if (rule.kind === "extension" && name.endsWith(rule.value)) return true;
    return mime !== "" && mimeMatches(mime, rule);
  });
}

/**
 * Judges a drag in progress, when only MIME types are known.
 *
 * @param mimeTypes - Types from `dataTransfer.items` (may contain empty strings)
 * @param rules - Rules from {@link parseAccept}
 * @returns "accepted" if every typed item matches, "rejected" if none can, "unknown" otherwise
 */
export function dragMatchesAccept(mimeTypes: string[], rules: AcceptRule[]): DragAcceptance {
  if (rules.length === 0) return "accepted";
  if (mimeTypes.length === 0 || mimeTypes.some((mime) => mime === "")) return "unknown";
  const hasUnmappedExtension = rules.some(
    (rule) => rule.kind === "extension" && !EXTENSION_MIME[rule.value],
  );
  const matching = mimeTypes.filter((mime) => rules.some((rule) => mimeMatches(mime, rule)));
  if (matching.length === mimeTypes.length) return "accepted";
  if (hasUnmappedExtension) return "unknown";
  return matching.length === 0 ? "rejected" : "unknown";
}

/**
 * Builds a short label such as "PDF, PNG, images" for the drop zone.
 *
 * @param rules - Rules from {@link parseAccept}
 * @param maxItems - Labels after this many are summarised as "+N"
 * @returns Display text, or an empty string when anything is accepted
 */
export function describeAccept(rules: AcceptRule[], maxItems = 3): string {
  const labels = rules.map((rule) => {
    if (rule.kind === "extension") return rule.value.slice(1).toUpperCase();
    if (rule.kind === "wildcard") return WILDCARD_LABELS[rule.value] ?? rule.value;
    const known = MIME_EXTENSION[rule.value];
    if (known) return known.slice(1).toUpperCase();
    const subtype = (rule.value.split("/")[1] ?? rule.value).replace(/^(x-|vnd\.)/, "");
    return subtype.split("+")[0]!.toUpperCase();
  });
  const unique = [...new Set(labels)];
  if (unique.length <= maxItems) return unique.join(", ");
  return `${unique.slice(0, maxItems).join(", ")} +${unique.length - maxItems}`;
}
