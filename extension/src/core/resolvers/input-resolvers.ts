import { isRendered } from "../dom";
import type { CollectedInputs, DropTarget, ResolveContext, Resolver } from "../types";
import { findVisibleAnchor, inputTarget } from "./shared";

/** Plain, visible `<input type="file">` elements in the main document. */
export class VisibleInputResolver implements Resolver {
  readonly name = "visible-input" as const;

  resolve(_context: ResolveContext, collected: CollectedInputs): DropTarget[] {
    return collected.light.filter(isRendered).map((input) => inputTarget(input, input, this.name));
  }
}

/** Hidden inputs behind a label, a styled button, or a small wrapper. */
export class LabelledInputResolver implements Resolver {
  readonly name = "labelled-input" as const;

  resolve(_context: ResolveContext, collected: CollectedInputs): DropTarget[] {
    const targets: DropTarget[] = [];
    for (const input of collected.light) {
      if (isRendered(input)) continue;
      const anchor = findVisibleAnchor(input);
      if (anchor) targets.push(inputTarget(input, anchor, this.name));
    }
    return targets;
  }
}

/** Inputs inside shadow roots (web components), visible or hidden. */
export class ShadowInputResolver implements Resolver {
  readonly name = "shadow-input" as const;

  resolve(_context: ResolveContext, collected: CollectedInputs): DropTarget[] {
    const targets: DropTarget[] = [];
    for (const input of collected.shadow) {
      const anchor = isRendered(input) ? input : findVisibleAnchor(input);
      if (anchor) targets.push(inputTarget(input, anchor, this.name));
    }
    return targets;
  }
}

/**
 * When the page has exactly one upload field, the whole page becomes a drop zone for it.
 * Off by default: on pages with a single unrelated avatar field this would surprise people.
 */
export class PageFallbackResolver implements Resolver {
  readonly name = "page-fallback" as const;

  resolve(context: ResolveContext, collected: CollectedInputs): DropTarget[] {
    if (!context.settings.pageFallback) return [];
    const all = [...collected.light, ...collected.shadow];
    if (all.length !== 1) return [];
    return [inputTarget(all[0]!, context.document.documentElement, this.name, { fullPage: true })];
  }
}
