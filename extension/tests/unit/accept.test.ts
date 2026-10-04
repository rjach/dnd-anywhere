import { describe, expect, it } from "vitest";
import {
  describeAccept,
  dragMatchesAccept,
  fileMatchesAccept,
  parseAccept,
} from "../../src/core/accept";

const file = (name: string, type: string) => ({ name, type });

describe("parseAccept", () => {
  it("returns no rules for an empty or missing attribute", () => {
    expect(parseAccept(null)).toEqual([]);
    expect(parseAccept("")).toEqual([]);
    expect(parseAccept(" , ")).toEqual([]);
  });

  it("parses MIME types, wildcards and extensions, case-insensitively", () => {
    expect(parseAccept("image/*, .PDF ,application/json")).toEqual([
      { kind: "wildcard", value: "image/*" },
      { kind: "extension", value: ".pdf" },
      { kind: "mime", value: "application/json" },
    ]);
  });

  it("ignores tokens that are neither", () => {
    expect(parseAccept("pdf, image/png")).toEqual([{ kind: "mime", value: "image/png" }]);
  });
});

describe("fileMatchesAccept", () => {
  it("accepts anything when there are no rules", () => {
    expect(fileMatchesAccept(file("a.exe", ""), [])).toBe(true);
  });

  it("matches by extension, MIME and wildcard", () => {
    const rules = parseAccept(".pdf,image/*,text/csv");
    expect(fileMatchesAccept(file("Report.PDF", ""), rules)).toBe(true);
    expect(fileMatchesAccept(file("photo", "image/heic"), rules)).toBe(true);
    expect(fileMatchesAccept(file("data.txt", "text/csv"), rules)).toBe(true);
    expect(fileMatchesAccept(file("song.mp3", "audio/mpeg"), rules)).toBe(false);
  });

  it("matches an extension rule by MIME when the name has no extension", () => {
    expect(fileMatchesAccept(file("scan", "application/pdf"), parseAccept(".pdf"))).toBe(true);
  });
});

describe("dragMatchesAccept", () => {
  it("is accepted when there are no rules", () => {
    expect(dragMatchesAccept(["anything/at-all"], [])).toBe("accepted");
  });

  it("is unknown when the browser hides some types", () => {
    expect(dragMatchesAccept(["", "image/png"], parseAccept("image/*"))).toBe("unknown");
    expect(dragMatchesAccept([], parseAccept("image/*"))).toBe("unknown");
  });

  it("accepts when every type matches, rejects when none do", () => {
    const rules = parseAccept("image/*,.pdf");
    expect(dragMatchesAccept(["image/png", "application/pdf"], rules)).toBe("accepted");
    expect(dragMatchesAccept(["audio/mpeg"], rules)).toBe("rejected");
    expect(dragMatchesAccept(["audio/mpeg", "image/png"], rules)).toBe("unknown");
  });

  it("stays unknown for extensions we can't map to a MIME type", () => {
    expect(dragMatchesAccept(["application/octet-stream"], parseAccept(".sketch"))).toBe("unknown");
  });
});

describe("describeAccept", () => {
  it("builds short labels", () => {
    expect(describeAccept(parseAccept(".pdf,image/png,image/*"))).toBe("PDF, PNG, images");
    expect(describeAccept(parseAccept("application/vnd.ms-excel"))).toBe("XLS");
    expect(describeAccept(parseAccept("application/x-rar-compressed"))).toBe("RAR-COMPRESSED");
    expect(describeAccept([])).toBe("");
  });

  it("summarises long lists", () => {
    expect(describeAccept(parseAccept(".a,.b,.c,.d,.e"))).toBe("A, B, C +2");
  });

  it("deduplicates", () => {
    expect(describeAccept(parseAccept(".jpg,.JPG"))).toBe("JPG");
  });
});
