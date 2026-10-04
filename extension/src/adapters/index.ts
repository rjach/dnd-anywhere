import type { SiteAdapter } from "./types";

/**
 * Every adapter shipped with the extension. Adapters are bundled, never fetched:
 * Chrome's MV3 policy forbids remote code, and we wouldn't want it anyway.
 *
 * To add one, create `src/adapters/<site>.ts`, import it here, and add a fixture
 * plus a test (see docs/adding-a-site-adapter.md).
 */
export const SITE_ADAPTERS: readonly SiteAdapter[] = [];

export type { SiteAdapter } from "./types";
