import { normalizeSettings, type Settings } from "./schema";

const STORAGE_KEY = "settings";

/** Minimal storage surface so settings logic can be tested without browser APIs. */
export interface StorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface StorageChangeSource {
  addListener(
    listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void,
  ): void;
  removeListener(
    listener: (changes: Record<string, { newValue?: unknown }>, area: string) => void,
  ): void;
}

/** Reads, writes and watches settings stored under one key. */
export class SettingsStore {
  constructor(
    private readonly area: StorageArea,
    private readonly changes: StorageChangeSource,
    private readonly areaName = "sync",
  ) {}

  async load(): Promise<Settings> {
    const stored = await this.area.get(STORAGE_KEY);
    return normalizeSettings(stored[STORAGE_KEY]);
  }

  async save(settings: Settings): Promise<Settings> {
    const normalized = normalizeSettings(settings);
    await this.area.set({ [STORAGE_KEY]: normalized });
    return normalized;
  }

  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await this.load();
    return this.save({ ...current, ...patch });
  }

  /**
   * Calls `listener` whenever settings change in any context (popup, options, other tabs).
   *
   * @returns A function that stops listening
   */
  watch(listener: (settings: Settings) => void): () => void {
    const handler = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== this.areaName || !(STORAGE_KEY in changes)) return;
      listener(normalizeSettings(changes[STORAGE_KEY]?.newValue));
    };
    this.changes.addListener(handler);
    return () => this.changes.removeListener(handler);
  }
}

/**
 * Settings store backed by `storage.sync`.
 * Sync is the documented default (see the privacy policy): settings follow the user
 * across their own signed-in browsers, and contain nothing but preferences.
 */
export function createBrowserSettingsStore(): SettingsStore {
  return new SettingsStore(browser.storage.sync, browser.storage.onChanged, "sync");
}
