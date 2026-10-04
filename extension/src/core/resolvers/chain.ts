import { SITE_ADAPTERS } from "../../adapters";
import type { SiteAdapter } from "../../adapters/types";
import { collectFileInputs, containsDeep } from "../dom";
import type { DropTarget, ResolveContext, Resolver } from "../types";
import { SiteAdapterResolver } from "./adapter-resolver";
import {
  LabelledInputResolver,
  PageFallbackResolver,
  ShadowInputResolver,
  VisibleInputResolver,
} from "./input-resolvers";
import { TriggerResolver } from "./trigger-resolver";

export interface ResolveResult {
  targets: DropTarget[];
  /** Milliseconds spent resolving; reported in diagnostics. */
  durationMs: number;
}

function overlaps(a: Element, b: Element): boolean {
  return containsDeep(a, b) || containsDeep(b, a);
}

/**
 * Runs resolvers in priority order and keeps the first target found for each input
 * and each region of the page, so one upload control never gets two drop zones.
 */
export class ResolverChain {
  constructor(
    private readonly resolvers: readonly Resolver[],
    private readonly now: () => number = () => performance.now(),
  ) {}

  resolve(context: ResolveContext): ResolveResult {
    const started = this.now();
    const collected = collectFileInputs(context.document, context.getShadowRoot);
    const targets: DropTarget[] = [];
    const claimedInputs = new Set<HTMLInputElement>();

    for (const resolver of this.resolvers) {
      for (const target of resolver.resolve(context, collected)) {
        if (this.isDuplicate(target, targets, claimedInputs)) continue;
        if (target.input && !target.fullPage) claimedInputs.add(target.input);
        targets.push(target);
      }
    }
    return { targets, durationMs: this.now() - started };
  }

  private isDuplicate(
    candidate: DropTarget,
    accepted: readonly DropTarget[],
    claimedInputs: ReadonlySet<HTMLInputElement>,
  ): boolean {
    if (candidate.fullPage) return accepted.some((target) => target.fullPage);
    if (candidate.input && claimedInputs.has(candidate.input)) return true;
    return accepted.some((target) => {
      if (target.fullPage) return false;
      if (overlaps(target.anchor, candidate.anchor)) return true;
      // A trigger wrapping an input we already handle is the same control.
      return (
        candidate.kind === "trigger" &&
        !!target.input &&
        containsDeep(candidate.anchor, target.input)
      );
    });
  }
}

/**
 * The default chain, in the priority order documented in docs/architecture.md.
 *
 * @param adapters - Site adapters; defaults to the bundled set
 */
export function createDefaultChain(
  adapters: readonly SiteAdapter[] = SITE_ADAPTERS,
): ResolverChain {
  return new ResolverChain([
    new SiteAdapterResolver(adapters),
    new VisibleInputResolver(),
    new LabelledInputResolver(),
    new ShadowInputResolver(),
    new TriggerResolver(),
    new PageFallbackResolver(),
  ]);
}
