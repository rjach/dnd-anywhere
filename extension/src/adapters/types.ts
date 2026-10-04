import type { DropTarget, ResolveContext } from "../core/types";

/**
 * A hand-written rule for one site whose upload control the generic resolvers miss.
 * See docs/adding-a-site-adapter.md. Every adapter needs a fixture and a test.
 */
export interface SiteAdapter {
  /** Unique, kebab-case, usually the site's domain: "example-com". */
  id: string;
  /** One line describing what the adapter handles, shown in diagnostics. */
  description: string;
  /** Tested against the full page URL. */
  matches: RegExp[];
  /** Return targets for this page. Build them with `inputTarget` / `triggerTarget`. */
  resolve(context: ResolveContext): DropTarget[];
}
