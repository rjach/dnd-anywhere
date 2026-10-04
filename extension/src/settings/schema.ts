export const SETTINGS_VERSION = 1;

export type ForceModifier = "Alt" | "Shift" | "none";
export type MotionPreference = "system" | "reduce" | "allow";

export interface Settings {
  version: number;
  /** Master switch. */
  enabled: boolean;
  /** Origins (e.g. "https://example.com") where the extension stays inactive. */
  disabledOrigins: string[];
  /** Reject files that don't match the input's `accept` attribute. */
  strictAccept: boolean;
  /** When a page has exactly one upload field, accept drops anywhere on the page. */
  pageFallback: boolean;
  /** Offer drop zones on upload buttons that create their file input on click. */
  triggerCapture: boolean;
  /** Look for upload fields inside closed shadow roots. */
  closedShadowRoots: boolean;
  /** Hold this key while dragging to use our drop zones even where the site has its own. */
  forceModifier: ForceModifier;
  /** Hex colour for drop zones. */
  accentColor: string;
  reducedMotion: MotionPreference;
  /** Log resolver decisions to the console. */
  debug: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  version: SETTINGS_VERSION,
  enabled: true,
  disabledOrigins: [],
  strictAccept: true,
  pageFallback: false,
  triggerCapture: true,
  closedShadowRoots: true,
  forceModifier: "Alt",
  accentColor: "#2563eb",
  reducedMotion: "system",
  debug: false,
});

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const FORCE_MODIFIERS: readonly ForceModifier[] = ["Alt", "Shift", "none"];
const MOTION_PREFERENCES: readonly MotionPreference[] = ["system", "reduce", "allow"];

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function pickOrigins(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const origins = value.filter((item): item is string => typeof item === "string" && item !== "");
  return [...new Set(origins)].sort();
}

/**
 * Turns anything read from storage or an imported file into valid settings.
 * Unknown keys are dropped and bad values fall back to defaults, so a corrupt
 * store can never break the content script.
 *
 * @param raw - Untrusted stored value
 * @returns Complete, valid settings at the current schema version
 */
export function normalizeSettings(raw: unknown): Settings {
  const input = migrate(typeof raw === "object" && raw !== null ? raw : {});
  return {
    version: SETTINGS_VERSION,
    enabled: pickBoolean(input.enabled, DEFAULT_SETTINGS.enabled),
    disabledOrigins: pickOrigins(input.disabledOrigins),
    strictAccept: pickBoolean(input.strictAccept, DEFAULT_SETTINGS.strictAccept),
    pageFallback: pickBoolean(input.pageFallback, DEFAULT_SETTINGS.pageFallback),
    triggerCapture: pickBoolean(input.triggerCapture, DEFAULT_SETTINGS.triggerCapture),
    closedShadowRoots: pickBoolean(input.closedShadowRoots, DEFAULT_SETTINGS.closedShadowRoots),
    forceModifier: pickEnum(input.forceModifier, FORCE_MODIFIERS, DEFAULT_SETTINGS.forceModifier),
    accentColor:
      typeof input.accentColor === "string" && HEX_COLOR.test(input.accentColor)
        ? input.accentColor.toLowerCase()
        : DEFAULT_SETTINGS.accentColor,
    reducedMotion: pickEnum(
      input.reducedMotion,
      MOTION_PREFERENCES,
      DEFAULT_SETTINGS.reducedMotion,
    ),
    debug: pickBoolean(input.debug, DEFAULT_SETTINGS.debug),
  };
}

/**
 * Upgrades older stored shapes. Add a step here whenever SETTINGS_VERSION goes up,
 * and never remove old steps: users can skip versions.
 */
function migrate(raw: object): Record<string, unknown> {
  const data = { ...(raw as Record<string, unknown>) };
  // v0 (pre-release builds) stored disabled sites under "blockedSites".
  if (data.version === undefined && Array.isArray(data.blockedSites)) {
    data.disabledOrigins = data.blockedSites;
    delete data.blockedSites;
  }
  return data;
}

/**
 * Whether the extension should run for a given origin.
 *
 * @param settings - Current settings
 * @param origin - Origin of the top-level page
 */
export function isActiveFor(settings: Settings, origin: string): boolean {
  return settings.enabled && !settings.disabledOrigins.includes(origin);
}
