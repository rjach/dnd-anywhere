import { describe, expect, it, vi } from "vitest";
import { parseAccept } from "../../src/core/accept";
import { injectFiles, selectFiles } from "../../src/core/injector";
import { html, makeFile } from "./helpers";

describe("injectFiles", () => {
  it("sets files and fires bubbling input and change events in order", () => {
    html(`<form><input type="file" multiple></form>`);
    const input = document.querySelector("input")!;
    const events: string[] = [];
    document.addEventListener("input", (event) => events.push(`${event.type}:${event.bubbles}`));
    document.addEventListener("change", (event) => events.push(`${event.type}:${event.bubbles}`));
    injectFiles(input, [makeFile("a.png", "image/png"), makeFile("b.png", "image/png")]);
    expect([...input.files!].map((file) => file.name)).toEqual(["a.png", "b.png"]);
    expect(events).toEqual(["input:true", "change:true"]);
  });

  it("replaces the previous selection like the native picker", () => {
    html(`<input type="file">`);
    const input = document.querySelector("input")!;
    injectFiles(input, [makeFile("old.txt", "text/plain")]);
    const onChange = vi.fn();
    input.addEventListener("change", onChange);
    injectFiles(input, [makeFile("new.txt", "text/plain")]);
    expect([...input.files!].map((file) => file.name)).toEqual(["new.txt"]);
    expect(onChange).toHaveBeenCalledOnce();
  });
});

describe("selectFiles", () => {
  const files = [makeFile("a.pdf", "application/pdf"), makeFile("b.png", "image/png")];

  it("filters by accept when strict", () => {
    const result = selectFiles(files, parseAccept(".pdf"), true, true);
    expect(result.accepted.map((file) => file.name)).toEqual(["a.pdf"]);
    expect(result.rejected.map((file) => file.name)).toEqual(["b.png"]);
    expect(result.tooMany).toBe(false);
  });

  it("ignores accept when not strict", () => {
    expect(selectFiles(files, parseAccept(".pdf"), true, false).accepted).toHaveLength(2);
  });

  it("flags too many files for a single-file input", () => {
    expect(selectFiles(files, [], false, true).tooMany).toBe(true);
    expect(selectFiles(files.slice(0, 1), [], false, true).tooMany).toBe(false);
  });
});
