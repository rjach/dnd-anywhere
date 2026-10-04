import {
  centerOf,
  dragFiles,
  expect,
  leaveWindow,
  overlayHost,
  PDF,
  PNG,
  test,
  TXT,
} from "./fixtures";

test.describe("dropping onto upload controls", () => {
  test("plain visible input", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/plain.html");
    const result = await dragFiles(page, await centerOf(page, "#file"), [PDF]);
    // Chrome ignores dropEffect writes on script-created DataTransfers, so only
    // the cancelled dragover is observable here; unit tests cover dropEffect.
    expect(result.dragoverPrevented).toBe(true);
    await expect(page.locator("#result")).toHaveText("resume.pdf");
  });

  test("respects accept and multiple", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/accept-multiple.html");
    await dragFiles(page, await centerOf(page, "#file"), [
      PNG,
      { name: "b.png", type: "image/png" },
      PDF,
    ]);
    await expect(page.locator("#result")).toHaveText("photo.png,b.png");
  });

  test("hidden input behind <label for>", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/label-for.html");
    await dragFiles(page, await centerOf(page, "label"), [TXT]);
    await expect(page.locator("#result")).toHaveText("notes.txt");
  });

  test("hidden input wrapped in a label", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/wrapped-label.html");
    await dragFiles(page, await centerOf(page, "#anchor"), [TXT]);
    await expect(page.locator("#result")).toHaveText("notes.txt");
  });

  test("button that creates a detached input (trigger capture)", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/ephemeral.html");
    await dragFiles(page, await centerOf(page, "#upload"), [TXT, PDF]);
    await expect(page.locator("#result")).toHaveText("notes.txt,resume.pdf");
  });

  test("button that calls showPicker() (trigger capture)", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/show-picker.html");
    await dragFiles(page, await centerOf(page, "#upload"), [TXT]);
    await expect(page.locator("#result")).toHaveText("notes.txt");
  });

  test("the native picker still opens on a real click", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/ephemeral.html");
    const chooser = page.waitForEvent("filechooser");
    await page.click("#upload");
    await expect(chooser).resolves.toBeTruthy();
  });

  test("open shadow root", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/shadow-open.html");
    await dragFiles(page, await centerOf(page, "#host"), [TXT]);
    await expect(page.locator("#result")).toHaveText("notes.txt");
  });

  test("closed shadow root", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/shadow-closed.html");
    await dragFiles(page, await centerOf(page, "#host"), [TXT]);
    await expect(page.locator("#result")).toHaveText("notes.txt");
  });

  test("same-origin and cross-origin iframes", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/iframe.html");
    for (const id of ["same", "cross"]) {
      const frame = page.frameLocator(`#${id}`);
      await expect(frame.locator("#file")).toBeVisible();
      const handle = await page.locator(`#${id}`).elementHandle();
      const inner = (await handle!.contentFrame())!;
      await dragFiles(inner, await centerOf(inner, "#file"), [PDF]);
      await expect(frame.locator("#result")).toHaveText("resume.pdf");
    }
  });

  test("React controlled form", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/react.html");
    await dragFiles(page, await centerOf(page, "label"), [PDF]);
    await expect(page.locator("#result")).toHaveText("resume.pdf");
  });

  test("Vue form", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/vue.html");
    await dragFiles(page, await centerOf(page, "label"), [PDF, TXT]);
    await expect(page.locator("#result")).toHaveText("resume.pdf,notes.txt");
  });

  test("input added after page load", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/dynamic.html");
    await page.waitForSelector("body[data-ready]");
    await dragFiles(page, await centerOf(page, "#file"), [PDF]);
    await expect(page.locator("#result")).toHaveText("resume.pdf");
  });
});

test.describe("staying out of the way", () => {
  test("pages with their own drop zone keep handling drops", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/native-dnd.html");
    await dragFiles(page, await centerOf(page, "#file"), [PDF]);
    await expect(page.locator("#result")).toHaveText("native:resume.pdf");
  });

  test("holding Alt uses our zone instead", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/native-dnd.html");
    await dragFiles(page, await centerOf(page, "#file"), [PDF], { altKey: true });
    await expect(page.locator("#result")).toHaveText("input:resume.pdf");
  });

  test("disabled inputs are not targets", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/disabled.html");
    const result = await dragFiles(page, await centerOf(page, "#file"), [PDF], { drop: false });
    expect(result.dragoverPrevented).toBe(false);
    await expect(overlayHost(page)).toHaveCount(0);
  });

  test("overlay appears only while dragging", async ({ context }) => {
    const page = await context.newPage();
    await page.goto("/plain.html");
    await expect(overlayHost(page)).toHaveCount(0);
    await dragFiles(page, await centerOf(page, "#file"), [PDF], { drop: false });
    await expect(overlayHost(page)).toHaveCount(1);
    await leaveWindow(page);
    await expect(overlayHost(page)).toHaveCount(0);
  });
});
