import { describe, expect, it } from "vitest";
import messages from "../../public/_locales/en/messages.json";
import i18nSource from "../../src/shared/i18n.ts?raw";
import { buildDiagnosticReport } from "../../src/shared/diagnostics";
import { fileCount, setTranslator, t } from "../../src/shared/i18n";
import { siteReportUrl } from "../../src/shared/links";

describe("messages.json", () => {
  const source = i18nSource;
  const typeBlock = source.slice(
    source.indexOf("export type MessageKey"),
    source.indexOf(";", source.indexOf("export type MessageKey")),
  );
  const declaredKeys = [...typeBlock.matchAll(/"([A-Za-z]+)"/g)].map((match) => match[1]).sort();

  it("matches the MessageKey type exactly", () => {
    expect(Object.keys(messages).sort()).toEqual(declaredKeys);
  });

  it("declares every placeholder it uses", () => {
    for (const [key, entry] of Object.entries(messages) as [
      string,
      { message: string; placeholders?: object },
    ][]) {
      const used = [...entry.message.matchAll(/\$([A-Z_]+)\$/g)].map((match) =>
        match[1]!.toLowerCase(),
      );
      expect(Object.keys(entry.placeholders ?? {}).sort(), key).toEqual([...new Set(used)].sort());
    }
  });

  it("keeps the store description within Chrome's 132 characters", () => {
    expect(messages.extDescription.message.length).toBeLessThanOrEqual(132);
  });
});

describe("t", () => {
  it("substitutes placeholders and pluralises file counts", () => {
    expect(t("toastAdded", [fileCount(3), "Photos"])).toBe("Added 3 files to Photos");
    expect(fileCount(1)).toBe("1 file");
  });

  it("falls back to the key when there's no translator", () => {
    const original = t("extName");
    setTranslator(null);
    expect(t("extName")).toBe("extName");
    setTranslator(() => original);
  });
});

describe("siteReportUrl", () => {
  it("prefills only the origin", () => {
    const url = new URL(siteReportUrl("https://mail.example.com", "1.2.3"));
    expect(url.origin + url.pathname).toBe("https://github.com/rjach/dnd-anywhere/issues/new");
    expect(url.searchParams.get("template")).toBe("site_not_working.yml");
    expect(url.searchParams.get("site")).toBe("https://mail.example.com");
    expect(url.searchParams.get("title")).toBe("Site not working: mail.example.com");
    expect(url.searchParams.get("version")).toBe("1.2.3");
  });
});

describe("buildDiagnosticReport", () => {
  const chromeUa = "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/141.0.7390.54 Safari/537.36";

  it("includes versions, origin and resolver counts", () => {
    const report = buildDiagnosticReport("1.0.0", chromeUa, {
      origin: "https://a.test",
      active: true,
      enabledGlobally: true,
      targetCount: 3,
      durationMs: 1.2,
      bySource: { "visible-input": 2, trigger: 1 },
      adapters: [],
    });
    expect(report).toContain("Extension: 1.0.0");
    expect(report).toContain("Browser: Chrome 141.0.7390.54");
    expect(report).toContain("Targets: 3 (visible-input=2, trigger=1)");
    expect(report).toContain("Adapters: none");
  });

  it("handles pages where the extension can't run", () => {
    expect(buildDiagnosticReport("1.0.0", "weird", null)).toContain("Browser: unknown");
  });
});
