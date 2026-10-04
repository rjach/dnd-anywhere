import { afterEach, describe, expect, it, vi } from "vitest";
import { CaptureBridge } from "../../src/core/capture-bridge";
import { installCaptureShim } from "../../src/core/capture-shim";
import { CAPTURE_CHANNEL, isCaptureMessage } from "../../src/shared/capture-protocol";
import { html, makeFile } from "./helpers";

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  uninstall = undefined;
});

function install() {
  uninstall = installCaptureShim(window as Window & typeof globalThis);
}

/** A button that creates a detached file input on click, as many upload widgets do. */
function ephemeralUploadButton(onFiles: (files: File[]) => void, accept = "", multiple = true) {
  html(`<button type="button">Upload</button>`);
  const button = document.querySelector("button")!;
  button.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = multiple;
    if (accept) input.accept = accept;
    input.addEventListener("change", () => onFiles([...(input.files ?? [])]));
    input.click();
  });
  return button;
}

describe("capture shim + bridge", () => {
  it("answers the page's picker request with the dropped files", async () => {
    install();
    const received = vi.fn();
    const button = ephemeralUploadButton(received);
    const bridge = new CaptureBridge(window, () => "nonce-1");
    const files = [makeFile("a.txt", "text/plain"), makeFile("b.txt", "text/plain")];

    const outcome = await bridge.capture(button, files, true);

    expect(outcome).toEqual({
      status: "captured",
      accepted: 2,
      rejected: 0,
      truncated: false,
      acceptAttribute: "",
    });
    expect(received.mock.calls[0]![0].map((file: File) => file.name)).toEqual(["a.txt", "b.txt"]);
  });

  it("filters by the input's accept attribute and truncates for single-file inputs", async () => {
    install();
    const received = vi.fn();
    const button = ephemeralUploadButton(received, "image/*", false);
    const bridge = new CaptureBridge(window, () => "nonce-2");
    const outcome = await bridge.capture(
      button,
      [
        makeFile("a.png", "image/png"),
        makeFile("b.png", "image/png"),
        makeFile("c.pdf", "application/pdf"),
      ],
      true,
    );
    expect(outcome).toMatchObject({
      status: "captured",
      accepted: 1,
      rejected: 1,
      truncated: true,
    });
    expect(received.mock.calls[0]![0]).toHaveLength(1);
  });

  it("reports a rejection when nothing matches", async () => {
    install();
    const received = vi.fn();
    const button = ephemeralUploadButton(received, ".pdf");
    const outcome = await new CaptureBridge(window, () => "n3").capture(
      button,
      [makeFile("a.png", "image/png")],
      true,
    );
    expect(outcome).toEqual({ status: "rejected", acceptAttribute: ".pdf" });
    expect(received).not.toHaveBeenCalled();
  });

  it("times out when the button doesn't open a picker, and disarms", async () => {
    install();
    html(`<button type="button">Upload</button>`);
    const button = document.querySelector("button")!;
    const bridge = new CaptureBridge(window, () => "n4", 50);
    const outcome = await bridge.capture(button, [makeFile("a.txt", "text/plain")], true);
    expect(outcome).toEqual({ status: "timeout" });

    // A later, unrelated picker request must open normally (pass through).
    const input = document.createElement("input");
    input.type = "file";
    const change = vi.fn();
    input.addEventListener("change", change);
    input.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(change).not.toHaveBeenCalled();
  });

  it("reports unavailable when the shim isn't installed", async () => {
    html(`<button type="button">Upload</button>`);
    const outcome = await new CaptureBridge(window, () => "n5").capture(
      document.querySelector("button")!,
      [makeFile("a.txt", "text/plain")],
      true,
    );
    expect(outcome).toEqual({ status: "unavailable" });
  });

  it("ignores arm messages with bad payloads", async () => {
    install();
    const replies: unknown[] = [];
    const listener = (event: MessageEvent) => {
      if (isCaptureMessage(event.data) && event.data.type === "armed") replies.push(event.data);
    };
    window.addEventListener("message", listener);
    window.postMessage(
      { channel: CAPTURE_CHANNEL, type: "arm", nonce: "x", files: ["not a file"], timeoutMs: 100 },
      "*",
    );
    window.postMessage(
      {
        channel: CAPTURE_CHANNEL,
        type: "arm",
        nonce: "y",
        files: [makeFile("a", "")],
        timeoutMs: 99999,
      },
      "*",
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    window.removeEventListener("message", listener);
    expect(replies).toEqual([]);
  });

  it("keeps wrapped functions looking native", () => {
    const before = HTMLElement.prototype.click.name;
    install();
    expect(HTMLElement.prototype.click.name).toBe(before);
  });
});
