import { describe, expect, it, vi } from "vitest";
import { watchForPageReaction } from "../../src/core/session";
import { createLogger } from "../../src/shared/logger";
import { isRuntimeMessage } from "../../src/shared/messages";
import { html } from "./helpers";

describe("createLogger", () => {
  it("logs with a prefix only when enabled", () => {
    let enabled = false;
    const sink = { debug: vi.fn() };
    const logger = createLogger(() => enabled, sink);
    logger.debug("hidden");
    expect(sink.debug).not.toHaveBeenCalled();
    enabled = true;
    logger.debug("shown");
    logger.debug("with details", { count: 2 });
    expect(sink.debug).toHaveBeenNthCalledWith(1, "[dnd-anywhere]", "shown");
    expect(sink.debug).toHaveBeenNthCalledWith(2, "[dnd-anywhere]", "with details", { count: 2 });
  });
});

describe("isRuntimeMessage", () => {
  it("accepts only our message types", () => {
    expect(isRuntimeMessage({ type: "dnda:status" })).toBe(true);
    expect(isRuntimeMessage({ type: "dnda:badge", active: true })).toBe(true);
    expect(isRuntimeMessage({ type: "other" })).toBe(false);
    expect(isRuntimeMessage(null)).toBe(false);
  });
});

describe("watchForPageReaction", () => {
  it("resolves true when the page changes the DOM", async () => {
    html(`<p id="name"></p>`);
    const reaction = watchForPageReaction(document, 500);
    document.getElementById("name")!.textContent = "cv.pdf";
    await expect(reaction).resolves.toBe(true);
  });

  it("resolves false when nothing changes", async () => {
    await expect(watchForPageReaction(document, 20)).resolves.toBe(false);
  });
});
