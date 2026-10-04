/** Keys in public/_locales/en/messages.json. Keep the two in sync (a unit test checks). */
export type MessageKey =
  | "extName"
  | "extDescription"
  | "actionTitle"
  | "zoneDrop"
  | "zoneTry"
  | "zoneNotAccepted"
  | "zonePageWide"
  | "zoneAccepts"
  | "offscreenAbove"
  | "offscreenBelow"
  | "fileCountOne"
  | "fileCountMany"
  | "toastAdded"
  | "toastSkipped"
  | "toastNoneAccepted"
  | "toastAcceptedTypes"
  | "toastOneFileOnly"
  | "toastNoReaction"
  | "toastTriggerFailed"
  | "toastTriggerUnavailable"
  | "actionUseFirst"
  | "actionCancel"
  | "actionOpenPicker"
  | "actionClickForMe"
  | "actionDismiss"
  | "uploadFieldFallback"
  | "popupEnabledHere"
  | "popupDisabledGlobally"
  | "popupFieldsDetected"
  | "popupNoFields"
  | "popupUnavailable"
  | "popupReportSite"
  | "popupReportConfirm"
  | "popupCopyDiagnostics"
  | "popupCopied"
  | "popupOptions"
  | "popupPrivacy"
  | "popupSource"
  | "optionsTitle"
  | "optionsGeneral"
  | "optionsEnabled"
  | "optionsEnabledHint"
  | "optionsDisabledSites"
  | "optionsDisabledSitesEmpty"
  | "optionsRemove"
  | "optionsBehavior"
  | "optionsStrictAccept"
  | "optionsStrictAcceptHint"
  | "optionsPageFallback"
  | "optionsPageFallbackHint"
  | "optionsTriggerCapture"
  | "optionsTriggerCaptureHint"
  | "optionsClosedShadow"
  | "optionsClosedShadowHint"
  | "optionsForceModifier"
  | "optionsForceModifierHint"
  | "optionsModifierNone"
  | "optionsAppearance"
  | "optionsAccent"
  | "optionsMotion"
  | "optionsMotionSystem"
  | "optionsMotionReduce"
  | "optionsMotionAllow"
  | "optionsAdvanced"
  | "optionsDebug"
  | "optionsDebugHint"
  | "optionsExport"
  | "optionsImport"
  | "optionsImported"
  | "optionsImportFailed"
  | "optionsReset"
  | "optionsSaved"
  | "welcomeTitle"
  | "welcomeLead"
  | "welcomeTryTitle"
  | "welcomeTryHint"
  | "welcomeTryResult"
  | "welcomePermissionTitle"
  | "welcomePermissionBody"
  | "welcomePrivacyTitle"
  | "welcomePrivacyBody";

type Translator = (key: string, substitutions?: string | string[]) => string;

function defaultTranslator(): Translator | null {
  const api = (globalThis as { chrome?: { i18n?: { getMessage?: Translator } } }).chrome;
  return api?.i18n?.getMessage ? api.i18n.getMessage.bind(api.i18n) : null;
}

let translator: Translator | null = defaultTranslator();

/** Replace the translator (tests use the English messages file directly). */
export function setTranslator(next: Translator | null): void {
  translator = next;
}

/**
 * Looks up a UI string through `chrome.i18n`.
 *
 * @param key - Message key from messages.json
 * @param substitutions - Values for `$1`…`$9` placeholders
 * @returns The translated string, or the key itself if it's missing (visible, so it gets noticed)
 */
export function t(key: MessageKey, substitutions?: string | string[]): string {
  return translator?.(key, substitutions) || key;
}

/** "1 file" / "3 files". `chrome.i18n` has no plural rules, so we pick the key. */
export function fileCount(count: number): string {
  return count === 1 ? t("fileCountOne") : t("fileCountMany", String(count));
}
