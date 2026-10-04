import { SITE_ADAPTERS } from "@/src/adapters";
import { startContentRuntime, topLevelOrigin } from "@/src/content/runtime";
import { DEFAULT_SETTINGS, isActiveFor, type Settings } from "@/src/settings/schema";
import { createBrowserSettingsStore } from "@/src/settings/store";
import { isRuntimeMessage, type StatusResponse } from "@/src/shared/messages";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  allFrames: true,
  matchOriginAsFallback: true,
  noScriptStartedPostMessage: true,
  async main(ctx) {
    const store = createBrowserSettingsStore();
    const topOrigin = topLevelOrigin(location);
    const isTopFrame = window === window.top;
    let settings: Settings = { ...DEFAULT_SETTINGS };
    try {
      settings = await store.load();
    } catch {
      // Storage can be unavailable while the extension updates; defaults are safe.
    }

    const runtime = startContentRuntime({
      win: window,
      doc: document,
      getSettings: () => settings,
      topOrigin,
    });

    // Only the top frame reports badge state, and only when it's "off": Chrome
    // clears per-tab badges on navigation, so the common case costs nothing.
    let badgeShown = false;
    const reportBadge = () => {
      if (!isTopFrame) return;
      const active = isActiveFor(settings, topOrigin);
      if (active && !badgeShown) return;
      badgeShown = !active;
      browser.runtime.sendMessage({ type: "dnda:badge", active }).catch(() => undefined);
    };
    reportBadge();

    const unwatch = store.watch((next) => {
      settings = next;
      reportBadge();
    });

    const onMessage = (
      message: unknown,
      _sender: unknown,
      sendResponse: (response: StatusResponse) => void,
    ) => {
      if (!isTopFrame || !isRuntimeMessage(message) || message.type !== "dnda:status") return false;
      const summary = runtime.session.inspect();
      sendResponse({
        origin: topOrigin,
        active: isActiveFor(settings, topOrigin),
        enabledGlobally: settings.enabled,
        targetCount: summary.targetCount,
        durationMs: summary.durationMs,
        bySource: summary.bySource,
        adapters: SITE_ADAPTERS.filter((adapter) =>
          adapter.matches.some((pattern) => pattern.test(location.href)),
        ).map((adapter) => adapter.id),
      });
      return false;
    };
    browser.runtime.onMessage.addListener(onMessage);

    ctx.onInvalidated(() => {
      runtime.stop();
      unwatch();
      browser.runtime.onMessage.removeListener(onMessage);
    });
  },
});
