import { parseAccept } from "../accept";
import { cleanText, describeInput, isRendered, parentElementDeep, refineFieldName } from "../dom";
import type { DropTarget, ResolverName } from "../types";

/** How far up the tree to look for a visible stand-in for a hidden input. */
const MAX_ANCESTOR_DEPTH = 3;
/** Ancestors bigger than this share of the viewport are page sections, not upload controls. */
const MAX_ANCHOR_VIEWPORT_SHARE = 0.5;
const CLICKABLE_SELECTOR = 'button, [role="button"], label, a, input[type="button"]';
const FALLBACK_LABEL = "upload field";

let targetCounter = 0;

/**
 * Builds a target for a known file input.
 *
 * @param input - The file input that will receive files
 * @param anchor - The element the user sees and drops onto
 * @param source - Resolver that found it
 */
export function inputTarget(
  input: HTMLInputElement,
  anchor: Element,
  source: ResolverName,
  overrides: Partial<DropTarget> = {},
): DropTarget {
  targetCounter += 1;
  const anchorText = anchor === input ? "" : cleanText(anchor.textContent);
  return {
    id: `dnda-${targetCounter}`,
    anchor,
    kind: "input",
    input,
    accept: parseAccept(input.getAttribute("accept")),
    multiple: input.multiple,
    label: refineFieldName(describeInput(input, anchorText || FALLBACK_LABEL), anchor),
    source,
    heuristic: false,
    ...overrides,
  };
}

/** Builds a target for a button that opens a file picker we can't see in advance. */
export function triggerTarget(anchor: Element, label: string): DropTarget {
  targetCounter += 1;
  return {
    id: `dnda-${targetCounter}`,
    anchor,
    kind: "trigger",
    accept: [],
    multiple: true,
    label: refineFieldName(cleanText(label), anchor) || FALLBACK_LABEL,
    source: "trigger",
    heuristic: true,
  };
}

function isCompact(element: Element): boolean {
  const view = element.ownerDocument.defaultView;
  if (!view) return false;
  const rect = element.getBoundingClientRect();
  const viewportArea = Math.max(1, view.innerWidth * view.innerHeight);
  return (rect.width * rect.height) / viewportArea <= MAX_ANCHOR_VIEWPORT_SHARE;
}

function isPageRoot(element: Element): boolean {
  return element.localName === "body" || element.localName === "html";
}

/**
 * Finds the visible element that stands for a hidden file input: a rendered
 * `<label>`, a nearby button, or a compact wrapper. Returns null when nothing
 * plausible is close by, so we never highlight half the page.
 *
 * @param input - A file input that is not itself rendered
 */
export function findVisibleAnchor(input: HTMLInputElement): Element | null {
  for (const label of input.labels ?? []) {
    if (isRendered(label)) return label;
  }
  let ancestor = parentElementDeep(input);
  for (let depth = 0; ancestor && depth < MAX_ANCESTOR_DEPTH; depth += 1) {
    if (isPageRoot(ancestor)) return null;
    if (ancestor.matches(CLICKABLE_SELECTOR) && isRendered(ancestor)) return ancestor;
    const clickables = [...ancestor.querySelectorAll(CLICKABLE_SELECTOR)].filter(isRendered);
    if (clickables.length === 1) return clickables[0]!;
    if (isRendered(ancestor) && isCompact(ancestor)) return ancestor;
    ancestor = parentElementDeep(ancestor);
  }
  return null;
}
