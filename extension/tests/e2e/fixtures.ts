import {
  test as base,
  chromium,
  expect,
  type BrowserContext,
  type Frame,
  type Page,
} from "@playwright/test";
import { fileURLToPath } from "node:url";

const EXTENSION_PATH = fileURLToPath(new URL("../../.output/chrome-mv3", import.meta.url));

export interface FileSpec {
  name: string;
  type: string;
  content?: string;
}

/** A browser with the built extension loaded, plus its extension ID. */
export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      channel: "chromium",
      headless: !process.env.HEADED,
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
    await use(new URL(worker.url()).host);
  },
});

export { expect };

type Target = Page | Frame;

/**
 * Simulates an OS file drag onto the point (x, y): dragenter, dragover (twice, so
 * the overlay has rendered), then optionally drop. Events are dispatched on the
 * element under the point, as the browser would.
 */
export async function dragFiles(
  target: Target,
  point: { x: number; y: number },
  files: FileSpec[],
  options: { drop?: boolean; altKey?: boolean } = {},
): Promise<{ dragoverPrevented: boolean }> {
  return target.evaluate(
    async ({ point, files, drop, altKey }) => {
      const transfer = new DataTransfer();
      for (const spec of files)
        transfer.items.add(new File([spec.content ?? "x"], spec.name, { type: spec.type }));
      const element = document.elementFromPoint(point.x, point.y) ?? document.body;
      const fire = (type: string) => {
        const event = new DragEvent(type, {
          bubbles: true,
          cancelable: true,
          composed: true,
          clientX: point.x,
          clientY: point.y,
          altKey,
          dataTransfer: transfer,
        });
        element.dispatchEvent(event);
        return event;
      };
      fire("dragenter");
      fire("dragover");
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const over = fire("dragover");
      const result = { dragoverPrevented: over.defaultPrevented };
      if (drop) fire("drop");
      return result;
    },
    { point, files, drop: options.drop ?? true, altKey: options.altKey ?? false },
  );
}

/** Center of an element, in the coordinate space of its frame. */
export async function centerOf(
  target: Target,
  selector: string,
): Promise<{ x: number; y: number }> {
  const box = await target
    .locator(selector)
    .first()
    .evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    });
  return box;
}

/** Ends a drag that wasn't dropped, the way leaving the window does. */
export async function leaveWindow(target: Target): Promise<void> {
  await target.evaluate(() => {
    document.body.dispatchEvent(new DragEvent("dragleave", { bubbles: true, relatedTarget: null }));
  });
}

export const overlayHost = (target: Target) => target.locator("dnd-anywhere-overlay");

export const PDF: FileSpec = { name: "resume.pdf", type: "application/pdf" };
export const PNG: FileSpec = { name: "photo.png", type: "image/png" };
export const TXT: FileSpec = { name: "notes.txt", type: "text/plain" };
