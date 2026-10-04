import { isRuntimeMessage } from "@/src/shared/messages";

const OFF_BADGE_COLOR = "#6b7280";

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason !== "install") return;
    // The welcome page is bundled with the extension, so opening it fetches nothing.
    void browser.tabs.create({ url: browser.runtime.getURL("/welcome.html") });
  });

  browser.runtime.onMessage.addListener((message: unknown, sender) => {
    if (!isRuntimeMessage(message) || message.type !== "dnda:badge") return;
    const tabId = sender.tab?.id;
    if (tabId === undefined) return;
    void browser.action.setBadgeText({ tabId, text: message.active ? "" : "off" });
    void browser.action.setBadgeBackgroundColor({ tabId, color: OFF_BADGE_COLOR });
  });
});
