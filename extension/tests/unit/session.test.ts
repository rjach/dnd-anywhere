import { afterEach, describe, expect, it, vi } from "vitest";
import type { CaptureOutcome, CapturePort } from "../../src/core/capture-bridge";
import { createDefaultChain } from "../../src/core/resolvers/chain";
import { DragSession, type SessionDependencies } from "../../src/core/session";
import { normalizeSettings, type Settings } from "../../src/settings/schema";
import type { OverlayPort, OverlayView, ToastSpec } from "../../src/ui/overlay/types";
import { dragEvent, html, makeFile } from "./helpers";

interface ToastRecord {
  spec: ToastSpec;
  updates: Partial<ToastSpec>[];
}

class FakeOverlay implements OverlayPort {
  views: OverlayView[] = [];
  toasts: ToastRecord[] = [];
  cleared = 0;
  setTheme = vi.fn();
  showZones(view: OverlayView) {
    this.views.push(view);
  }
  clearZones() {
    this.cleared += 1;
  }
  toast(spec: ToastSpec) {
    const record: ToastRecord = { spec, updates: [] };
    this.toasts.push(record);
    return { update: (patch: Partial<ToastSpec>) => record.updates.push(patch), dismiss: vi.fn() };
  }
  get lastView() {
    return this.views.at(-1);
  }
}

function setup(
  options: { settings?: Partial<Settings>; capture?: CaptureOutcome; reacted?: boolean } = {},
) {
  const overlay = new FakeOverlay();
  const settings = normalizeSettings(options.settings ?? {});
  const capture: CapturePort = {
    capture: vi.fn(async () => options.capture ?? { status: "timeout" as const }),
  };
  const injectFiles = vi.fn((input: HTMLInputElement, files: readonly File[]) => {
    const transfer = new DataTransfer();
    for (const file of files) transfer.items.add(file);
    input.files = transfer.files;
  });
  const deps: SessionDependencies = {
    win: window,
    doc: document,
    chain: createDefaultChain([]),
    overlay,
    capture,
    getSettings: () => settings,
    topOrigin: "https://site.test",
    getShadowRoot: (element) => element.shadowRoot,
    logger: { debug: vi.fn() },
    injectFiles,
    watchForReaction: async () => options.reacted ?? true,
  };
  const session = new DragSession(deps);
  const detach = session.attach();
  cleanups.push(detach);
  return { session, overlay, capture, injectFiles };
}

const cleanups: (() => void)[] = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()!();
});

const pdf = () => makeFile("cv.pdf", "application/pdf");

/** Simulates the browser's event sequence for dragging files to (x, y) and dropping. */
function dragTo(
  target: Element,
  files: File[],
  x: number,
  y: number,
  extra: { altKey?: boolean } = {},
) {
  target.dispatchEvent(dragEvent("dragenter", files, { clientX: x, clientY: y, ...extra }));
  const over = dragEvent("dragover", files, { clientX: x, clientY: y, ...extra });
  target.dispatchEvent(over);
  return over;
}

function drop(
  target: Element,
  files: File[],
  x: number,
  y: number,
  extra: { altKey?: boolean } = {},
) {
  const event = dragEvent("drop", files, { clientX: x, clientY: y, ...extra });
  target.dispatchEvent(event);
  return event;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("DragSession", () => {
  it("does nothing for drags without files", () => {
    html(`<input type="file" data-rect="0,0,200,40">`);
    const { overlay } = setup();
    const event = new Event("dragenter", { bubbles: true }) as DragEvent;
    Object.defineProperty(event, "dataTransfer", { value: new DataTransfer() });
    document.body.dispatchEvent(event);
    expect(overlay.views).toHaveLength(0);
  });

  it("shows zones while dragging and fills the input on drop", async () => {
    html(
      `<label for="cv">CV</label><input id="cv" type="file" accept=".pdf" data-rect="10,10,200,40">`,
    );
    const { overlay, injectFiles } = setup();
    const input = document.querySelector("input")!;
    const files = [pdf()];

    const over = dragTo(input, files, 50, 20);
    expect(over.defaultPrevented).toBe(true);
    expect(over.dataTransfer!.dropEffect).toBe("copy");
    expect(overlay.lastView!.zones).toHaveLength(1);
    expect(overlay.lastView!.zones[0]).toMatchObject({ state: "active", label: "Drop to upload" });

    const pageDrop = vi.fn();
    input.addEventListener("drop", pageDrop);
    const dropEvent = drop(input, files, 50, 20);
    await flush();

    expect(dropEvent.defaultPrevented).toBe(true);
    expect(pageDrop).not.toHaveBeenCalled();
    expect(injectFiles).toHaveBeenCalledWith(input, files);
    expect(overlay.toasts[0]!.spec).toMatchObject({
      tone: "success",
      message: "Added 1 file to CV",
    });
    expect(overlay.cleared).toBeGreaterThan(0);
  });

  it("blocks drops outside zones instead of letting the browser open the file", () => {
    html(`<input type="file" data-rect="10,10,200,40"><p id="elsewhere"></p>`);
    const { injectFiles } = setup();
    const over = dragTo(document.getElementById("elsewhere")!, [pdf()], 500, 500);
    expect(over.defaultPrevented).toBe(true);
    expect(over.dataTransfer!.dropEffect).toBe("none");
    expect(injectFiles).not.toHaveBeenCalled();
  });

  it("steps aside where the page handles drag and drop itself", async () => {
    html(
      `<div id="native" data-rect="0,0,400,200"><input type="file" data-rect="10,10,200,40"></div>`,
    );
    const { injectFiles, overlay } = setup();
    const zone = document.getElementById("native")!;
    const pageDrop = vi.fn((event: Event) => event.preventDefault());
    zone.addEventListener("dragover", (event) => event.preventDefault());
    zone.addEventListener("drop", pageDrop);
    const input = zone.querySelector("input")!;

    dragTo(input, [pdf()], 50, 20);
    expect(overlay.lastView!.zones[0]!.state).toBe("idle");
    drop(input, [pdf()], 50, 20);
    await flush();
    expect(pageDrop).toHaveBeenCalled();
    expect(injectFiles).not.toHaveBeenCalled();
  });

  it("takes over a native zone while the force modifier is held", async () => {
    html(
      `<div id="native" data-rect="0,0,400,200"><input type="file" data-rect="10,10,200,40"></div>`,
    );
    const { injectFiles } = setup();
    const zone = document.getElementById("native")!;
    const pageDrop = vi.fn();
    zone.addEventListener("dragover", (event) => event.preventDefault());
    zone.addEventListener("drop", pageDrop);
    const input = zone.querySelector("input")!;

    dragTo(input, [pdf()], 50, 20, { altKey: true });
    drop(input, [pdf()], 50, 20, { altKey: true });
    await flush();
    expect(pageDrop).not.toHaveBeenCalled();
    expect(injectFiles).toHaveBeenCalled();
  });

  it("marks zones that can't take the dragged types and refuses the drop", () => {
    html(`<input type="file" accept="image/*" data-rect="10,10,200,40">`);
    const { overlay, injectFiles } = setup();
    const input = document.querySelector("input")!;
    const over = dragTo(input, [pdf()], 50, 20);
    expect(overlay.lastView!.zones[0]!.state).toBe("rejected");
    expect(over.dataTransfer!.dropEffect).toBe("none");
    drop(input, [pdf()], 50, 20);
    expect(injectFiles).not.toHaveBeenCalled();
  });

  it("stays inert on sites the user turned off", () => {
    html(`<input type="file" data-rect="10,10,200,40">`);
    const { overlay } = setup({ settings: { disabledOrigins: ["https://site.test"] } });
    dragTo(document.querySelector("input")!, [pdf()], 50, 20);
    expect(overlay.views).toHaveLength(0);
  });

  it("asks before using only the first file on a single-file input", async () => {
    html(`<input type="file" aria-label="Avatar" data-rect="10,10,200,40">`);
    const { overlay, injectFiles } = setup();
    const input = document.querySelector("input")!;
    const files = [makeFile("a.png", "image/png"), makeFile("b.png", "image/png")];
    dragTo(input, files, 50, 20);
    drop(input, files, 50, 20);
    await flush();
    expect(injectFiles).not.toHaveBeenCalled();
    const toast = overlay.toasts[0]!;
    expect(toast.spec.message).toBe("Avatar takes one file");
    toast.spec.actions![0]!.run();
    expect(injectFiles).toHaveBeenCalledWith(input, [files[0]]);
  });

  it("offers the real picker when a hidden input gets no visible reaction", async () => {
    html(`<label for="f" data-rect="0,0,120,36">Upload</label><input id="f" type="file" hidden>`);
    const { overlay } = setup({ reacted: false });
    const label = document.querySelector("label")!;
    dragTo(label, [pdf()], 20, 20);
    drop(label, [pdf()], 20, 20);
    await flush();
    await flush();
    const update = overlay.toasts[0]!.updates[0]!;
    expect(update.actions![0]!.label).toBe("Open file picker");
  });

  it("delivers to trigger buttons through the capture port", async () => {
    html(`<button type="button" data-rect="0,0,120,36">Upload</button>`);
    const { overlay, capture } = setup({
      capture: {
        status: "captured",
        accepted: 1,
        rejected: 0,
        truncated: false,
        acceptAttribute: "",
      },
    });
    const button = document.querySelector("button")!;
    dragTo(button, [pdf()], 20, 20);
    expect(overlay.lastView!.zones[0]).toMatchObject({ heuristic: true });
    drop(button, [pdf()], 20, 20);
    await flush();
    expect(capture.capture).toHaveBeenCalledWith(button, [expect.any(File)], true);
    expect(overlay.toasts[0]!.spec.message).toBe("Added 1 file to Upload");
  });

  it("offers to click the button when capture times out", async () => {
    html(`<button type="button" data-rect="0,0,120,36">Upload</button>`);
    const { overlay } = setup({ capture: { status: "timeout" } });
    const button = document.querySelector("button")!;
    const clicked = vi.fn();
    button.addEventListener("click", clicked);
    dragTo(button, [pdf()], 20, 20);
    drop(button, [pdf()], 20, 20);
    await flush();
    const toast = overlay.toasts[0]!;
    expect(toast.spec).toMatchObject({
      tone: "error",
      message: "This button didn't take the drop",
    });
    toast.spec.actions![0]!.run();
    expect(clicked).toHaveBeenCalled();
  });

  it("clears zones shortly after the drag leaves the window", async () => {
    html(`<input type="file" data-rect="10,10,200,40">`);
    const { overlay } = setup();
    const input = document.querySelector("input")!;
    dragTo(input, [pdf()], 50, 20);
    input.dispatchEvent(dragEvent("dragleave", [pdf()], { relatedTarget: null }));
    expect(overlay.cleared).toBe(0);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(overlay.cleared).toBe(1);
  });

  it("counts edge indicators for zones scrolled out of view", () => {
    html(`
      <input type="file" data-rect="10,-300,200,40">
      <input type="file" data-rect="10,10,200,40">
      <input type="file" data-rect="10,5000,200,40">
    `);
    const { overlay } = setup();
    dragTo(document.querySelectorAll("input")[1]!, [pdf()], 50, 20);
    expect(overlay.lastView).toMatchObject({ offscreenAbove: 1, offscreenBelow: 1 });
    expect(overlay.lastView!.zones).toHaveLength(1);
  });

  it("reports a summary for the popup without a drag", () => {
    html(
      `<input type="file" data-rect="10,10,200,40"><button type="button" data-rect="0,80,90,30">Upload</button>`,
    );
    const { session } = setup();
    expect(session.inspect()).toMatchObject({
      targetCount: 2,
      bySource: { "visible-input": 1, trigger: 1 },
    });
  });

  it("explains rejections and missing capture support for trigger buttons", async () => {
    html(`<button type="button" data-rect="0,0,120,36">Upload</button>`);
    const rejected = setup({ capture: { status: "rejected", acceptAttribute: ".pdf" } });
    const button = document.querySelector("button")!;
    dragTo(button, [pdf()], 20, 20);
    drop(button, [pdf()], 20, 20);
    await flush();
    expect(rejected.overlay.toasts[0]!.spec).toMatchObject({
      tone: "error",
      detail: "Accepted: PDF",
    });
    cleanups.pop()!();

    const unavailable = setup({ capture: { status: "unavailable" } });
    dragTo(button, [pdf()], 20, 20);
    drop(button, [pdf()], 20, 20);
    await flush();
    expect(unavailable.overlay.toasts[0]!.spec.message).toBe(
      "Drops on buttons aren't available in this frame",
    );
  });

  it("notes truncation and skipped files after a capture", async () => {
    html(`<button type="button" data-rect="0,0,120,36">Upload</button>`);
    const { overlay } = setup({
      capture: {
        status: "captured",
        accepted: 1,
        rejected: 2,
        truncated: true,
        acceptAttribute: "",
      },
    });
    const button = document.querySelector("button")!;
    dragTo(button, [pdf()], 20, 20);
    drop(button, [pdf()], 20, 20);
    await flush();
    expect(overlay.toasts[0]!.spec.detail).toBe("2 files skipped: not an accepted type");
    expect(overlay.toasts[0]!.updates[0]!.detail).toBe("Upload takes one file");
  });

  it("uses the Shift modifier and reduced motion when configured", () => {
    html(
      `<div id="native" data-rect="0,0,400,200"><input type="file" data-rect="10,10,200,40"></div>`,
    );
    const { overlay } = setup({ settings: { forceModifier: "Shift", reducedMotion: "reduce" } });
    const zone = document.getElementById("native")!;
    zone.addEventListener("dragover", (event) => event.preventDefault());
    dragTo(zone.querySelector("input")!, [pdf()], 50, 20);
    expect(overlay.setTheme).toHaveBeenCalledWith({ accent: "#2563eb", reduceMotion: true });
    expect(overlay.lastView!.zones[0]!.state).toBe("idle");
  });

  it("lets the page handle files rejected by every zone when strict accept is off", async () => {
    html(`<input type="file" accept="image/*" aria-label="Photo" data-rect="10,10,200,40">`);
    const { injectFiles } = setup({ settings: { strictAccept: false } });
    const input = document.querySelector("input")!;
    dragTo(input, [pdf()], 50, 20);
    drop(input, [pdf()], 50, 20);
    await flush();
    expect(injectFiles).toHaveBeenCalled();
  });

  it("shows a not-accepted toast when dropped files don't match", async () => {
    html(`<input type="file" accept=".pdf" data-rect="10,10,200,40">`);
    const { overlay, session } = setup();
    const input = document.querySelector("input")!;
    const [target] = createDefaultChain([]).resolve({
      document,
      settings: normalizeSettings({}),
      url: "https://site.test",
      getShadowRoot: () => null,
    }).targets;
    await session.deliver(target!, [makeFile("a.png", "image/png")]);
    expect(overlay.toasts[0]!.spec).toMatchObject({ tone: "error", detail: "Accepted: PDF" });
    const click = vi.spyOn(input, "click").mockImplementation(() => undefined);
    overlay.toasts[0]!.spec.actions![0]!.run();
    expect(click).toHaveBeenCalled();
  });
});
