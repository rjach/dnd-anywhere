import { describe, expect, it, vi } from "vitest";
import { Overlay } from "../../src/ui/overlay/overlay";
import type { ZoneView } from "../../src/ui/overlay/types";

const zone = (id: string, overrides: Partial<ZoneView> = {}): ZoneView => ({
  id,
  rect: { x: 10, y: 20, width: 200, height: 40 },
  radius: "6px",
  state: "idle",
  label: "Drop to upload",
  detail: "CV",
  heuristic: false,
  fullPage: false,
  ...overrides,
});

const host = () => document.querySelector("dnd-anywhere-overlay") as HTMLElement | null;

describe("Overlay", () => {
  it("mounts a fixed, non-interactive host only while there is something to show", () => {
    const overlay = new Overlay(document);
    expect(host()).toBeNull();
    overlay.showZones({ zones: [zone("a")], offscreenAbove: 0, offscreenBelow: 0 });
    const element = host()!;
    expect(element.style.getPropertyValue("pointer-events")).toBe("none");
    expect(element.style.getPropertyPriority("pointer-events")).toBe("important");
    expect(element.shadowRoot).toBeNull(); // closed root
    overlay.clearZones();
    expect(host()).toBeNull();
  });

  it("keeps the host while a toast is visible, then removes it", () => {
    vi.useFakeTimers();
    try {
      const overlay = new Overlay(document);
      overlay.toast({ tone: "success", message: "Added" });
      expect(host()).not.toBeNull();
      vi.advanceTimersByTime(4100);
      expect(host()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps sticky toasts until dismissed and runs actions", () => {
    vi.useFakeTimers();
    try {
      const overlay = new Overlay(document);
      const run = vi.fn();
      const handle = overlay.toast({
        tone: "info",
        message: "Pick",
        durationMs: 0,
        actions: [{ label: "Go", run }],
      });
      vi.advanceTimersByTime(60_000);
      expect(host()).not.toBeNull();
      handle.dismiss();
      expect(host()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
