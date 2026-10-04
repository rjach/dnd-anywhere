import { describe, expect, it } from "vitest";
import { SiteAdapterResolver } from "../../src/core/resolvers/adapter-resolver";
import { ResolverChain, createDefaultChain } from "../../src/core/resolvers/chain";
import { inputTarget } from "../../src/core/resolvers/shared";
import { looksLikeUploadText } from "../../src/core/resolvers/trigger-resolver";
import type { SiteAdapter } from "../../src/adapters/types";
import { context, html } from "./helpers";

const resolve = (overrides = {}, extra = {}) =>
  createDefaultChain([]).resolve(context(overrides, extra)).targets;

describe("visible inputs", () => {
  it("targets a visible file input and reads its label and accept", () => {
    html(`
      <label for="cv">Your CV</label>
      <input id="cv" type="file" accept=".pdf" data-rect="10,10,200,30">
    `);
    const [target, ...rest] = resolve();
    expect(rest).toHaveLength(0);
    expect(target).toMatchObject({
      source: "visible-input",
      kind: "input",
      label: "Your CV",
      multiple: false,
    });
    expect(target!.anchor).toBe(document.getElementById("cv"));
    expect(target!.accept).toEqual([{ kind: "extension", value: ".pdf" }]);
  });

  it("skips disabled and readonly inputs", () => {
    html(`
      <input type="file" disabled data-rect="0,0,100,30">
      <input type="file" readonly data-rect="0,40,100,30">
    `);
    expect(resolve()).toHaveLength(0);
  });

  it("falls back to aria-label, then the name attribute", () => {
    html(`
      <input type="file" aria-label="Avatar" data-rect="0,0,100,30">
      <input type="file" name="supporting_docs[]" data-rect="0,40,100,30">
    `);
    expect(resolve().map((target) => target.label)).toEqual(["Avatar", "supporting docs"]);
  });
});

describe("hidden inputs", () => {
  it("anchors to a rendered <label for>", () => {
    html(`
      <label for="f" class="btn" data-rect="0,0,120,36">Upload photo</label>
      <input id="f" type="file" hidden>
    `);
    const [target] = resolve();
    expect(target).toMatchObject({ source: "labelled-input", label: "Upload photo" });
    expect(target!.anchor.tagName).toBe("LABEL");
  });

  it("anchors to a wrapping label", () => {
    html(`<label data-rect="0,0,120,36">Attach <input type="file" style="display:none"></label>`);
    expect(resolve()[0]!.anchor.tagName).toBe("LABEL");
  });

  it("anchors to the only button next to the input", () => {
    html(`
      <div data-rect="0,0,400,60">
        <button type="button" data-rect="0,0,100,36">Choose</button>
        <input type="file" hidden>
      </div>
    `);
    expect(resolve()[0]!.anchor.tagName).toBe("BUTTON");
  });

  it("anchors to a compact wrapper when there is no single button", () => {
    html(`
      <div class="dropzone" data-rect="0,0,300,120">
        <span>Drop here</span>
        <input type="file" hidden>
      </div>
    `);
    expect(resolve()[0]!.anchor.className).toBe("dropzone");
  });

  it("gives up rather than highlighting the whole page", () => {
    html(`<input type="file" hidden>`);
    document.body.setAttribute("data-rect", "0,0,1024,768");
    expect(resolve()).toHaveLength(0);
  });
});

describe("field names", () => {
  it("prefers a nearby caption over generic button text", () => {
    html(`
      <div><span>Resume</span><div><label for="r" data-rect="0,0,90,36">Browse…</label><input id="r" type="file" hidden></div></div>
      <div><label>Portfolio samples</label><div><button type="button" data-rect="0,60,90,36">Upload images</button></div></div>
    `);
    expect(resolve().map((target) => target.label)).toEqual(["Resume", "Portfolio samples"]);
  });

  it("keeps generic text when the nearest sibling is another control", () => {
    html(
      `<input type="text"><label for="r" data-rect="0,0,90,36">Browse…</label><input id="r" type="file" hidden>`,
    );
    expect(resolve()[0]!.label).toBe("Browse…");
  });
});

describe("shadow DOM", () => {
  it("finds inputs in open shadow roots", () => {
    html(`<x-uploader data-rect="0,0,200,50"></x-uploader>`);
    const host = document.querySelector("x-uploader")!;
    const root = host.attachShadow({ mode: "open" });
    root.innerHTML = `<input type="file" data-rect="0,0,200,40" aria-label="Shadow upload">`;
    const [target] = resolve();
    expect(target).toMatchObject({ source: "shadow-input", label: "Shadow upload" });
  });

  it("finds inputs in closed roots only through the injected getter", () => {
    html(`<x-closed></x-closed>`);
    const host = document.querySelector("x-closed")!;
    const root = host.attachShadow({ mode: "closed" });
    root.innerHTML = `<input type="file" data-rect="0,0,200,40">`;
    expect(resolve()).toHaveLength(0);
    const getter = (element: Element) => (element === host ? root : element.shadowRoot);
    expect(resolve({}, { getShadowRoot: getter })).toHaveLength(1);
  });
});

describe("trigger buttons", () => {
  it("targets buttons whose text reads like an upload action", () => {
    html(`
      <button type="button" data-rect="0,0,100,36">Upload files</button>
      <button type="button" data-rect="0,50,100,36">Save</button>
      <div role="button" aria-label="Attach a document" data-rect="0,100,36,36"></div>
    `);
    const targets = resolve();
    expect(targets.map((target) => target.label)).toEqual(["Upload files", "Attach a document"]);
    expect(targets.every((target) => target.kind === "trigger" && target.heuristic)).toBe(true);
  });

  it("uses class names as a weaker hint for icon buttons", () => {
    html(
      `<button type="button" class="icon upload-btn" data-rect="0,0,36,36"><svg></svg></button>`,
    );
    expect(resolve()).toHaveLength(1);
  });

  it("never targets links that navigate or buttons that submit forms", () => {
    html(`
      <a href="/upload" data-rect="0,0,100,30">Upload</a>
      <form><button data-rect="0,40,100,30">Upload</button></form>
      <button type="button" disabled data-rect="0,80,100,30">Upload</button>
      <a href="#" data-rect="0,120,100,30">Upload</a>
    `);
    const targets = resolve();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.anchor.getAttribute("href")).toBe("#");
  });

  it("is skipped when trigger capture is off", () => {
    html(`<button type="button" data-rect="0,0,100,36">Upload</button>`);
    expect(resolve({ triggerCapture: false })).toHaveLength(0);
  });

  it("does not add a trigger for a button already covering an input", () => {
    html(`
      <label for="f" data-rect="0,0,120,36"><button type="button" data-rect="0,0,120,36">Upload</button></label>
      <input id="f" type="file" hidden>
    `);
    const targets = resolve();
    expect(targets).toHaveLength(1);
    expect(targets[0]!.kind).toBe("input");
  });

  it.each([
    ["Upload", true],
    ["Browse…", true],
    ["Browse products", false],
    ["Adjuntar archivo", true],
    ["Dateien hochladen", true],
    ["上传文件", true],
    ["Download", false],
    ["Add files", true],
    ["Upload your best photos from the trip to share them with everyone", false],
  ])("looksLikeUploadText(%s) is %s", (text, expected) => {
    expect(looksLikeUploadText(text)).toBe(expected);
  });
});

describe("page fallback", () => {
  it("adds a full-page zone when on and the page has exactly one input", () => {
    html(`<input type="file" data-rect="0,0,100,30">`);
    expect(resolve().some((target) => target.fullPage)).toBe(false);
    const targets = resolve({ pageFallback: true });
    expect(targets).toHaveLength(2);
    expect(targets[1]).toMatchObject({ fullPage: true, source: "page-fallback" });
    expect(targets[1]!.input).toBe(targets[0]!.input);
  });

  it("stays off with several inputs", () => {
    html(`<input type="file" data-rect="0,0,100,30"><input type="file" data-rect="0,40,100,30">`);
    expect(resolve({ pageFallback: true }).some((target) => target.fullPage)).toBe(false);
  });
});

describe("chain and adapters", () => {
  const adapter: SiteAdapter = {
    id: "example-test",
    description: "Test adapter",
    matches: [/^https:\/\/example\.test\//],
    resolve: (ctx) => {
      const input = ctx.document.querySelector<HTMLInputElement>("#special")!;
      const anchor = ctx.document.querySelector("#special-zone")!;
      return [inputTarget(input, anchor, "visible-input")];
    },
  };

  it("runs matching adapters first and marks their source", () => {
    html(`
      <div id="special-zone" data-rect="0,0,300,200"></div>
      <input id="special" type="file" data-rect="0,300,100,30">
    `);
    const targets = createDefaultChain([adapter]).resolve(context()).targets;
    expect(targets).toHaveLength(1);
    expect(targets[0]).toMatchObject({ source: "adapter" });
    expect(targets[0]!.anchor.id).toBe("special-zone");
  });

  it("skips adapters for other URLs", () => {
    const resolver = new SiteAdapterResolver([adapter]);
    expect(resolver.matching("https://other.test/")).toHaveLength(0);
    expect(resolver.matching("https://example.test/a")).toHaveLength(1);
  });

  it("reports how long resolving took", () => {
    let now = 0;
    const chain = new ResolverChain([], () => (now += 5));
    expect(chain.resolve(context()).durationMs).toBe(5);
  });
});
