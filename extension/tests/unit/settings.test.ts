import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  isActiveFor,
  normalizeSettings,
} from "../../src/settings/schema";
import { SettingsStore, type StorageChangeSource } from "../../src/settings/store";

describe("normalizeSettings", () => {
  it("returns defaults for garbage", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values and drops invalid ones and unknown keys", () => {
    const result = normalizeSettings({
      enabled: false,
      strictAccept: "yes",
      forceModifier: "Ctrl",
      accentColor: "#ABCDEF",
      reducedMotion: "reduce",
      disabledOrigins: ["https://b.test", "https://a.test", "https://a.test", 4, ""],
      somethingElse: true,
    });
    expect(result).toEqual({
      ...DEFAULT_SETTINGS,
      enabled: false,
      accentColor: "#abcdef",
      reducedMotion: "reduce",
      disabledOrigins: ["https://a.test", "https://b.test"],
    });
    expect(result).not.toHaveProperty("somethingElse");
  });

  it("rejects colours that aren't 6-digit hex", () => {
    expect(normalizeSettings({ accentColor: "red" }).accentColor).toBe(
      DEFAULT_SETTINGS.accentColor,
    );
    expect(normalizeSettings({ accentColor: "#fff" }).accentColor).toBe(
      DEFAULT_SETTINGS.accentColor,
    );
  });

  it("migrates pre-release blockedSites", () => {
    const result = normalizeSettings({ blockedSites: ["https://old.test"] });
    expect(result.disabledOrigins).toEqual(["https://old.test"]);
    expect(result.version).toBe(SETTINGS_VERSION);
  });
});

describe("isActiveFor", () => {
  it("respects the global switch and the per-site list", () => {
    const settings = normalizeSettings({ disabledOrigins: ["https://off.test"] });
    expect(isActiveFor(settings, "https://on.test")).toBe(true);
    expect(isActiveFor(settings, "https://off.test")).toBe(false);
    expect(isActiveFor({ ...settings, enabled: false }, "https://on.test")).toBe(false);
  });
});

describe("SettingsStore", () => {
  function createStore() {
    let data: Record<string, unknown> = {};
    const listeners = new Set<Parameters<StorageChangeSource["addListener"]>[0]>();
    const area = {
      get: vi.fn(async (key: string) => (key in data ? { [key]: data[key] } : {})),
      set: vi.fn(async (items: Record<string, unknown>) => {
        data = { ...data, ...items };
        for (const listener of listeners) {
          listener(
            Object.fromEntries(Object.entries(items).map(([k, v]) => [k, { newValue: v }])),
            "sync",
          );
        }
      }),
    };
    const changes: StorageChangeSource = {
      addListener: (listener) => listeners.add(listener),
      removeListener: (listener) => listeners.delete(listener),
    };
    return { store: new SettingsStore(area, changes), area, listeners };
  }

  it("loads defaults from an empty store", async () => {
    const { store } = createStore();
    await expect(store.load()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("updates, normalizes and notifies watchers", async () => {
    const { store, listeners } = createStore();
    const seen: boolean[] = [];
    const stop = store.watch((settings) => seen.push(settings.debug));
    const saved = await store.update({ debug: true, accentColor: "bad" });
    expect(saved.debug).toBe(true);
    expect(saved.accentColor).toBe(DEFAULT_SETTINGS.accentColor);
    expect(seen).toEqual([true]);
    stop();
    expect(listeners.size).toBe(0);
  });

  it("ignores changes to other areas and keys", async () => {
    const { store, listeners } = createStore();
    const watcher = vi.fn();
    store.watch(watcher);
    for (const listener of listeners) {
      listener({ settings: { newValue: {} } }, "local");
      listener({ other: { newValue: 1 } }, "sync");
    }
    expect(watcher).not.toHaveBeenCalled();
  });
});
