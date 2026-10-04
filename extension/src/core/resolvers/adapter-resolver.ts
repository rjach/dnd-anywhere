import type { SiteAdapter } from "../../adapters/types";
import type { DropTarget, ResolveContext, Resolver } from "../types";

/** Runs site adapters whose URL patterns match the current page. Highest priority in the chain. */
export class SiteAdapterResolver implements Resolver {
  readonly name = "adapter" as const;

  constructor(private readonly adapters: readonly SiteAdapter[]) {}

  /** Adapters that apply to a URL. Exposed for diagnostics. */
  matching(url: string): SiteAdapter[] {
    return this.adapters.filter((adapter) => adapter.matches.some((pattern) => pattern.test(url)));
  }

  resolve(context: ResolveContext): DropTarget[] {
    return this.matching(context.url).flatMap((adapter) =>
      adapter.resolve(context).map((target) => ({ ...target, source: this.name })),
    );
  }
}
