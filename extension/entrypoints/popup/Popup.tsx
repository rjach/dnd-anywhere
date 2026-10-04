import { useEffect, useState } from "preact/hooks";
import { normalizeSettings, type Settings } from "@/src/settings/schema";
import { createBrowserSettingsStore } from "@/src/settings/store";
import { buildDiagnosticReport } from "@/src/shared/diagnostics";
import { t } from "@/src/shared/i18n";
import { PRIVACY_URL, REPOSITORY_URL, siteReportUrl } from "@/src/shared/links";
import type { StatusResponse } from "@/src/shared/messages";

const store = createBrowserSettingsStore();
const COPIED_RESET_MS = 1500;

type PageStatus =
  { kind: "loading" } | { kind: "unavailable" } | { kind: "ready"; status: StatusResponse };

/** Asks the top frame's content script for its status. Fails on pages extensions can't run on. */
async function fetchStatus(): Promise<PageStatus> {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return { kind: "unavailable" };
    const status = (await browser.tabs.sendMessage(
      tab.id,
      { type: "dnda:status" },
      { frameId: 0 },
    )) as StatusResponse | undefined;
    return status ? { kind: "ready", status } : { kind: "unavailable" };
  } catch {
    return { kind: "unavailable" };
  }
}

export function Popup() {
  const [settings, setSettings] = useState<Settings>(normalizeSettings({}));
  const [page, setPage] = useState<PageStatus>({ kind: "loading" });
  const [confirmingReport, setConfirmingReport] = useState(false);
  const [copied, setCopied] = useState(false);
  const version = browser.runtime.getManifest().version;

  useEffect(() => {
    void store.load().then(setSettings);
    void fetchStatus().then(setPage);
    return store.watch(setSettings);
  }, []);

  const origin = page.kind === "ready" ? page.status.origin : null;
  const enabledHere = origin !== null && !settings.disabledOrigins.includes(origin);

  const toggleSite = async (on: boolean) => {
    if (!origin) return;
    const others = settings.disabledOrigins.filter((item) => item !== origin);
    setSettings(await store.update({ disabledOrigins: on ? others : [...others, origin] }));
  };

  const copyDiagnostics = async () => {
    const report = buildDiagnosticReport(
      version,
      navigator.userAgent,
      page.kind === "ready" ? page.status : null,
    );
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_RESET_MS);
  };

  const openReport = () => {
    if (!origin) return;
    void browser.tabs.create({ url: siteReportUrl(origin, version) });
    window.close();
  };

  return (
    <main class="popup">
      <header class="head">
        <img src="/icon/48.png" width="24" height="24" alt="" />
        <h1>{t("extName")}</h1>
      </header>

      {!settings.enabled && <p class="notice">{t("popupDisabledGlobally")}</p>}

      <section class="card" aria-live="polite">
        {page.kind === "unavailable" && <p class="muted">{t("popupUnavailable")}</p>}
        {page.kind === "ready" && (
          <>
            <label class="row">
              <span>
                <strong>{t("popupEnabledHere")}</strong>
                <span class="host muted small">{origin}</span>
              </span>
              <span class="switch">
                <input
                  type="checkbox"
                  role="switch"
                  checked={enabledHere}
                  disabled={!settings.enabled}
                  onChange={(event) => void toggleSite(event.currentTarget.checked)}
                />
                <span />
              </span>
            </label>
            <p class="muted small status">
              {page.status.targetCount > 0
                ? t("popupFieldsDetected", String(page.status.targetCount))
                : t("popupNoFields")}
            </p>
          </>
        )}
      </section>

      {page.kind === "ready" && (
        <section class="actions">
          {confirmingReport ? (
            <div class="confirm">
              <p class="small">{t("popupReportConfirm", origin ?? "")}</p>
              <div class="buttons">
                <button class="button primary" onClick={openReport}>
                  {t("popupReportSite")}
                </button>
                <button class="button" onClick={() => setConfirmingReport(false)}>
                  {t("actionCancel")}
                </button>
              </div>
            </div>
          ) : (
            <button class="linklike" onClick={() => setConfirmingReport(true)}>
              {t("popupReportSite")}
            </button>
          )}
        </section>
      )}

      <footer class="foot small">
        <button class="linklike" onClick={() => void copyDiagnostics()}>
          {copied ? t("popupCopied") : t("popupCopyDiagnostics")}
        </button>
        <nav>
          <a
            href="#"
            onClick={(event) => (event.preventDefault(), void browser.runtime.openOptionsPage())}
          >
            {t("popupOptions")}
          </a>
          <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
            {t("popupPrivacy")}
          </a>
          <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
            {t("popupSource")}
          </a>
        </nav>
        <span class="muted">v{version}</span>
      </footer>
    </main>
  );
}
