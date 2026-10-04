import { CaptureBridge, type CapturePort } from "../core/capture-bridge";
import { createDefaultChain, type ResolverChain } from "../core/resolvers/chain";
import { DragSession } from "../core/session";
import type { Settings } from "../settings/schema";
import { createLogger } from "../shared/logger";
import { Overlay } from "../ui/overlay/overlay";

export interface ContentRuntimeOptions {
  win: Window;
  doc: Document;
  getSettings: () => Settings;
  topOrigin: string;
  getShadowRoot?: (element: Element) => ShadowRoot | null;
  chain?: ResolverChain;
  capture?: CapturePort;
}

export interface ContentRuntime {
  session: DragSession;
  stop: () => void;
}

/**
 * Origin of the top-level page, even from inside a cross-origin iframe, so that
 * "off for this site" also covers the site's embedded frames.
 */
export function topLevelOrigin(location: Location): string {
  const ancestors = location.ancestorOrigins;
  if (ancestors && ancestors.length > 0) return ancestors[ancestors.length - 1]!;
  return location.origin;
}

type ShadowRootGetter = (element: Element) => ShadowRoot | null;

/**
 * Shadow-root access for content scripts. Chrome exposes closed roots through
 * `chrome.dom.openOrClosedShadowRoot`, Firefox through `element.openOrClosedShadowRoot()`.
 * Neither needs a permission, and neither requires patching `attachShadow`.
 */
export function createShadowRootGetter(): ShadowRootGetter {
  const chromeDom = (
    globalThis as {
      chrome?: { dom?: { openOrClosedShadowRoot?: (e: HTMLElement) => ShadowRoot | null } };
    }
  ).chrome?.dom?.openOrClosedShadowRoot;
  return (element) => {
    try {
      if (chromeDom) return element instanceof HTMLElement ? (chromeDom(element) ?? null) : null;
      const firefox = (element as Element & { openOrClosedShadowRoot?: () => ShadowRoot | null })
        .openOrClosedShadowRoot;
      return firefox ? (firefox.call(element) ?? null) : element.shadowRoot;
    } catch {
      return element.shadowRoot;
    }
  };
}

/**
 * Wires the drag session, overlay and capture bridge for one frame.
 * Shared by the content script and the welcome page demo.
 */
export function startContentRuntime(options: ContentRuntimeOptions): ContentRuntime {
  const { win, doc, getSettings } = options;
  const motionQuery = win.matchMedia?.("(prefers-reduced-motion: reduce)");
  const session = new DragSession({
    win,
    doc,
    chain: options.chain ?? createDefaultChain(),
    overlay: new Overlay(doc),
    capture: options.capture ?? new CaptureBridge(win),
    getSettings,
    topOrigin: options.topOrigin,
    getShadowRoot: options.getShadowRoot ?? createShadowRootGetter(),
    logger: createLogger(() => getSettings().debug),
    prefersReducedMotion: () => motionQuery?.matches ?? false,
  });
  return { session, stop: session.attach() };
}
