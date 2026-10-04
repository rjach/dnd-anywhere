import { afterEach, beforeEach } from "vitest";
import messages from "../../public/_locales/en/messages.json";
import { setTranslator } from "../../src/shared/i18n";

type Message = { message: string; placeholders?: Record<string, { content: string }> };

/** Mirrors chrome.i18n.getMessage: named placeholders map to $1..$9 substitutions. */
function translate(key: string, substitutions?: string | string[]): string {
  const entry = (messages as Record<string, Message>)[key];
  if (!entry) return "";
  const values = substitutions === undefined ? [] : [substitutions].flat();
  return entry.message.replace(/\$([A-Z_]+)\$/gi, (_match, name: string) => {
    const content = entry.placeholders?.[name.toLowerCase()]?.content ?? "";
    return content.replace(/\$(\d)/g, (_m, index: string) => values[Number(index) - 1] ?? "");
  });
}

setTranslator(translate);

/**
 * happy-dom has no layout engine, so every rect is empty. Tests describe geometry
 * with `data-rect="x,y,width,height"`; elements without it (or that are hidden)
 * get an empty rect, just like an unrendered element in a browser.
 */
const originalRect = Element.prototype.getBoundingClientRect;

function isHidden(element: Element): boolean {
  for (let node: Element | null = element; node; node = node.parentElement) {
    if (node.hasAttribute("hidden")) return true;
    if (node instanceof HTMLElement && node.style.display === "none") return true;
  }
  return false;
}

/**
 * happy-dom's postMessage doesn't set `event.source`, which our protocol checks.
 * Re-dispatch the way browsers do: asynchronously, with source = window.
 */
window.postMessage = ((data: unknown) => {
  setTimeout(() => {
    const event = new MessageEvent("message", { data });
    Object.defineProperty(event, "source", { value: window });
    window.dispatchEvent(event);
  }, 0);
}) as typeof window.postMessage;

beforeEach(() => {
  Element.prototype.getBoundingClientRect = function getRect(this: Element) {
    const spec = this.getAttribute("data-rect");
    if (!spec || isHidden(this)) return new DOMRect(0, 0, 0, 0);
    const [x = 0, y = 0, width = 0, height = 0] = spec.split(",").map(Number);
    return new DOMRect(x, y, width, height);
  };
});

afterEach(() => {
  Element.prototype.getBoundingClientRect = originalRect;
  document.body.innerHTML = "";
});
