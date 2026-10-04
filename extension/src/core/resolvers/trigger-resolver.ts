import { cleanText, isRendered } from "../dom";
import type { DropTarget, ResolveContext, Resolver } from "../types";
import { triggerTarget } from "./shared";

/** Upload wording in the languages with the most web users. Matched against short texts only. */
const UPLOAD_WORDS = [
  // English
  /\bupload/i,
  /\battach/i,
  /^browse(\s+(files?|computer|device))?\s*(\.\.\.|…)?$/i,
  /\b(choose|select|add|import|drop)\s+(a\s+)?(files?|photos?|images?|documents?|videos?|attachments?)\b/i,
  // Spanish, Portuguese, Italian, French, German, Dutch
  /subir|adjuntar|seleccionar archivo|carregar|anexar|enviar arquivo|caricare|allegare|sfoglia/i,
  /t[ée]l[ée]verser|joindre|parcourir|choisir (un|des) fichiers?|importer/i,
  /hochladen|anh[äa]ngen|datei(en)? (aus)?w[äa]hlen|uploaden|bijvoegen/i,
  // Polish, Turkish, Russian, Ukrainian
  /prze[śs]lij|za[łl][ąa]cz|y[üu]kle|dosya se[çc]|загрузить|прикрепить|выбрать файл|завантажити/i,
  // Chinese, Japanese, Korean, Hindi
  /上传|上傳|附件|选择文件|選擇檔案|アップロード|添付|ファイルを選択|업로드|첨부|파일 선택|अपलोड/,
];
/** Class names and test ids are a weaker hint than visible text but common on icon-only buttons. */
const UPLOAD_HINT_ATTRIBUTE = /upload|attach|file-?picker|dropzone/i;
const CANDIDATE_SELECTOR = 'button, [role="button"], a, input[type="button"]';
/** Longer texts are paragraphs or menus, not buttons. */
const MAX_TEXT_LENGTH = 40;
/** Pages with dozens of matches are better served by site adapters than by guesses. */
const MAX_TRIGGERS = 12;

/** Visible text plus accessible names, which is what a user would read as the button's label. */
function readableName(element: Element): string {
  return cleanText(
    [
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element instanceof HTMLInputElement ? element.value : element.textContent,
    ]
      .filter(Boolean)
      .join(" "),
    MAX_TEXT_LENGTH * 2,
  );
}

/** Text that reads like an upload action. */
export function looksLikeUploadText(text: string): boolean {
  if (text === "" || text.length > MAX_TEXT_LENGTH) return false;
  return UPLOAD_WORDS.some((pattern) => pattern.test(text));
}

function hasUploadHintAttribute(element: Element): boolean {
  const hints = [
    element.id,
    element.getAttribute("class"),
    element.getAttribute("data-testid"),
    element.getAttribute("data-test"),
    element.getAttribute("name"),
  ];
  return hints.some((hint) => hint && UPLOAD_HINT_ATTRIBUTE.test(hint));
}

/**
 * Clicking these has side effects we must never cause: following a link or
 * submitting a form. Only "plain" buttons are safe to click on the user's behalf.
 */
function isSafeToClick(element: Element): boolean {
  if (element instanceof HTMLAnchorElement) {
    const href = element.getAttribute("href");
    return href === null || href === "" || href === "#" || href.startsWith("javascript:");
  }
  if (element instanceof HTMLButtonElement) {
    return !element.disabled && (element.type === "button" || element.form === null);
  }
  if (element instanceof HTMLInputElement) return !element.disabled;
  return element.getAttribute("aria-disabled") !== "true";
}

/**
 * Buttons that most likely open a file picker created on the fly. Dropping on one
 * clicks it while the capture shim is armed (see docs/architecture.md).
 */
export class TriggerResolver implements Resolver {
  readonly name = "trigger" as const;

  resolve(context: ResolveContext): DropTarget[] {
    if (!context.settings.triggerCapture) return [];
    const targets: DropTarget[] = [];
    for (const element of context.document.querySelectorAll(CANDIDATE_SELECTOR)) {
      if (targets.length >= MAX_TRIGGERS) break;
      if (!isSafeToClick(element) || !isRendered(element)) continue;
      const name = readableName(element);
      if (!looksLikeUploadText(name) && !hasUploadHintAttribute(element)) continue;
      targets.push(triggerTarget(element, name));
    }
    return targets;
  }
}
