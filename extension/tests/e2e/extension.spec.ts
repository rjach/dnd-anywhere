import { centerOf, dragFiles, expect, overlayHost, PDF, test } from "./fixtures";

/** The subset of extension APIs these tests call inside extension pages. */
declare const chrome: {
  storage: {
    sync: {
      get(key: string): Promise<Record<string, Record<string, unknown> | undefined>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
  };
  runtime: { getManifest(): { permissions?: string[]; host_permissions?: string[] } };
};

test.describe("extension pages and settings", () => {
  test("opens the welcome page on install, and its demo works", async ({
    context,
    extensionId,
  }) => {
    const welcomeUrl = `chrome-extension://${extensionId}/welcome.html`;
    const existing = context.pages().find((page) => page.url() === welcomeUrl);
    const page =
      existing ??
      (await context.waitForEvent("page", { predicate: (p) => p.url() === welcomeUrl }));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("DnD Anywhere is ready");
    await dragFiles(page, await centerOf(page, "label.button"), [PDF]);
    await expect(page.getByRole("status").first()).toHaveText("Received: resume.pdf");
  });

  test("turning a site off in options stops the overlay there", async ({
    context,
    extensionId,
  }) => {
    const options = await context.newPage();
    await options.goto(`chrome-extension://${extensionId}/options.html`);
    await options.evaluate(async () => {
      const { settings } = await chrome.storage.sync.get("settings");
      await chrome.storage.sync.set({
        settings: { ...settings, disabledOrigins: ["http://127.0.0.1:4321"] },
      });
    });
    await options.reload();
    await expect(options.locator(".sites code")).toHaveText("http://127.0.0.1:4321");

    const page = await context.newPage();
    await page.goto("/plain.html");
    const result = await dragFiles(page, await centerOf(page, "#file"), [PDF], { drop: false });
    expect(result.dragoverPrevented).toBe(false);
    await expect(overlayHost(page)).toHaveCount(0);

    await options.getByRole("button", { name: /Remove/ }).click();
    await expect(options.locator(".sites")).toHaveCount(0);
    await page.reload();
    await dragFiles(page, await centerOf(page, "#file"), [PDF]);
    await expect(page.locator("#result")).toHaveText("resume.pdf");
  });

  test("options toggles persist", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/options.html`);
    const debug = page.getByRole("switch", { name: "Debug logging" });
    await expect(debug).not.toBeChecked();
    await debug.check();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Debug logging" })).toBeChecked();
  });

  test("the popup reports when it can't run on a page", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(page.getByText("Browsers don't allow extensions on this page")).toBeVisible();
  });

  test("ships the expected manifest permissions", async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    const manifest = await page.evaluate(() => chrome.runtime.getManifest());
    expect(manifest.permissions).toEqual(["storage"]);
    expect(manifest.host_permissions ?? []).toEqual([]);
  });
});
