import { centerOf, expect, test } from "./fixtures";

/** Budget from PLAN §8.2: resolving on dragenter must fit in one frame. */
const DRAGENTER_BUDGET_MS = 16;

test("dragenter on a page with 50 inputs resolves within one frame", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("/many-inputs.html");
  const point = await centerOf(page, "input");
  // Content-script listeners run synchronously inside dispatchEvent, so this
  // measures our resolve + first render work.
  const samples = await page.evaluate((point) => {
    const timings: number[] = [];
    for (let run = 0; run < 5; run += 1) {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["x"], "a.txt", { type: "text/plain" }));
      const start = performance.now();
      document.body.dispatchEvent(
        new DragEvent("dragenter", {
          bubbles: true,
          dataTransfer: transfer,
          clientX: point.x,
          clientY: point.y,
        }),
      );
      timings.push(performance.now() - start);
      document.body.dispatchEvent(
        new DragEvent("dragleave", { bubbles: true, relatedTarget: null }),
      );
      document.body.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
    }
    return timings;
  }, point);
  const median = samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)]!;
  console.log(
    `dragenter median ${median.toFixed(2)} ms`,
    samples.map((value) => value.toFixed(2)),
  );
  expect(median).toBeLessThan(DRAGENTER_BUDGET_MS);
});

test("an idle page gets no overlay", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("/plain.html");
  await page.waitForTimeout(300);
  expect(await page.locator("dnd-anywhere-overlay").count()).toBe(0);
});
