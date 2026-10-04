import type { CollectedInputs } from "./types";

/** Minimum on-screen size for an element to count as visible. */
const MIN_VISIBLE_PX = 4;

/**
 * Whether an input can receive files. Disabled inputs are skipped because the user
 * couldn't pick files there either; `readonly` is honoured for the same reason even
 * though browsers ignore it on file inputs.
 */
export function isEligibleFileInput(input: HTMLInputElement): boolean {
  return input.type === "file" && !input.disabled && !input.hasAttribute("readonly");
}

/** Checks layout visibility. Opacity is ignored on purpose: many sites lay a transparent input over a styled button. */
export function isRendered(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  if (rect.width < MIN_VISIBLE_PX || rect.height < MIN_VISIBLE_PX) return false;
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  const style = view.getComputedStyle(element);
  return style.visibility !== "hidden" && style.display !== "none";
}

/**
 * Collects eligible file inputs from the document and every reachable shadow root.
 * Runs once per drag (on dragenter), never while the page is idle.
 *
 * @param root - Document to search
 * @param getShadowRoot - Returns the shadow root for an element (open or, when allowed, closed)
 */
export function collectFileInputs(
  root: Document,
  getShadowRoot: (element: Element) => ShadowRoot | null,
): CollectedInputs {
  const light = [...root.querySelectorAll<HTMLInputElement>('input[type="file" i]')].filter(
    isEligibleFileInput,
  );
  const shadow: HTMLInputElement[] = [];
  const visit = (scope: Document | ShadowRoot) => {
    for (const element of scope.querySelectorAll("*")) {
      const shadowRoot = getShadowRoot(element);
      if (!shadowRoot) continue;
      for (const input of shadowRoot.querySelectorAll<HTMLInputElement>('input[type="file" i]')) {
        if (isEligibleFileInput(input)) shadow.push(input);
      }
      visit(shadowRoot);
    }
  };
  visit(root);
  return { light, shadow };
}

/** Collapses whitespace and trims text to a display-friendly length. */
export function cleanText(text: string | null | undefined, maxLength = 40): string {
  const collapsed = (text ?? "").replace(/\s+/g, " ").trim();
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength - 1)}…` : collapsed;
}

/**
 * Best human-readable name for a file input: its label, aria attributes, or name.
 *
 * @param input - The file input
 * @param fallback - Used when nothing better exists
 */
export function describeInput(input: HTMLInputElement, fallback: string): string {
  const candidates = [
    input.getAttribute("aria-label"),
    labelledByText(input),
    ...[...(input.labels ?? [])].map((label) => label.textContent),
    input.title,
    input.name ? humanize(input.name) : "",
  ];
  return cleanText(candidates.find((text) => cleanText(text) !== "")) || fallback;
}

function labelledByText(input: HTMLInputElement): string {
  const ids = input.getAttribute("aria-labelledby")?.split(/\s+/) ?? [];
  const root = input.getRootNode() as Document | ShadowRoot;
  return ids.map((id) => root.getElementById?.(id)?.textContent ?? "").join(" ");
}

function humanize(name: string): string {
  return name
    .replace(/\[\]$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Whether `element` is `ancestor` or sits inside it, crossing shadow boundaries. */
export function containsDeep(ancestor: Element, element: Element): boolean {
  let node: Node | null = element;
  while (node) {
    if (node === ancestor) return true;
    node = node.parentNode ?? (node instanceof ShadowRoot ? node.host : null);
  }
  return false;
}

/** Parent element, stepping out of a shadow root to its host. */
export function parentElementDeep(element: Element): Element | null {
  if (element.parentElement) return element.parentElement;
  const root = element.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/** Short button wording like "Browse…" or "Upload images" says what to do, not what the field is. */
const GENERIC_ACTION = /^(browse|choose|select|upload|add|attach|pick|open|import)\b/i;
const MAX_GENERIC_LENGTH = 24;
const MAX_CAPTION_LENGTH = 40;
const MAX_CAPTION_DEPTH = 3;
const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a[href], [role="button"]';
const SKIPPED_SIBLINGS = 'input[type="file" i], script, style, template';

function isGenericAction(text: string): boolean {
  return text.length <= MAX_GENERIC_LENGTH && GENERIC_ACTION.test(text);
}

/**
 * Finds the caption a sighted user would read as the field's name: the nearest
 * preceding non-interactive sibling of the control or one of its close ancestors,
 * e.g. the "Resume" heading above a "Browse…" button.
 */
function nearbyCaption(anchor: Element): string | null {
  let node: Element | null = anchor;
  for (let depth = 0; node && depth < MAX_CAPTION_DEPTH; depth += 1) {
    if (node.localName === "body" || node.localName === "html") return null;
    let sibling = node.previousElementSibling;
    while (sibling?.matches(SKIPPED_SIBLINGS)) sibling = sibling.previousElementSibling;
    if (sibling) {
      if (sibling.matches(INTERACTIVE_SELECTOR) || sibling.querySelector(INTERACTIVE_SELECTOR))
        return null;
      const text = cleanText(sibling.textContent, MAX_CAPTION_LENGTH + 1);
      return text && text.length <= MAX_CAPTION_LENGTH ? text : null;
    }
    node = parentElementDeep(node);
  }
  return null;
}

/**
 * Replaces generic action text ("Browse…") with the field's visible caption when
 * there is one, so toasts say "Added resume.pdf to Resume".
 *
 * @param name - Name found so far
 * @param anchor - The control the user drops onto
 */
export function refineFieldName(name: string, anchor: Element): string {
  if (!isGenericAction(name)) return name;
  return nearbyCaption(anchor) ?? name;
}
