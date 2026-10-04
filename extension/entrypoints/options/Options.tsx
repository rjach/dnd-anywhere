import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  type ForceModifier,
  type MotionPreference,
  type Settings,
} from "@/src/settings/schema";
import { createBrowserSettingsStore } from "@/src/settings/store";
import { t } from "@/src/shared/i18n";
import { PRIVACY_URL, REPOSITORY_URL } from "@/src/shared/links";

const store = createBrowserSettingsStore();
const STATUS_RESET_MS = 2000;
const EXPORT_FILE_NAME = "dnd-anywhere-settings.json";

type BooleanKey = {
  [K in keyof Settings]: Settings[K] extends boolean ? K : never;
}[keyof Settings];

function Toggle(props: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const hintId = `${props.id}-hint`;
  return (
    <div class="field">
      <div>
        <label for={props.id}>{props.label}</label>
        <p id={hintId} class="muted small">
          {props.hint}
        </p>
      </div>
      <span class="switch">
        <input
          id={props.id}
          type="checkbox"
          role="switch"
          aria-describedby={hintId}
          checked={props.checked}
          onChange={(event) => props.onChange(event.currentTarget.checked)}
        />
        <span />
      </span>
    </div>
  );
}

function Section(props: { title: string; children: ComponentChildren }) {
  return (
    <section class="section">
      <h2>{props.title}</h2>
      <div class="card">{props.children}</div>
    </section>
  );
}

export function Options() {
  const [settings, setSettings] = useState<Settings>(normalizeSettings({}));
  const [status, setStatus] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void store.load().then(setSettings);
    return store.watch(setSettings);
  }, []);

  const flash = (message: string) => {
    setStatus(message);
    setTimeout(() => setStatus(""), STATUS_RESET_MS);
  };

  const update = async (patch: Partial<Settings>) => {
    setSettings(await store.update(patch));
    flash(t("optionsSaved"));
  };

  const toggle = (key: BooleanKey, id: string, label: string, hint: string) => (
    <Toggle
      id={id}
      label={label}
      hint={hint}
      checked={settings[key]}
      onChange={(checked) => void update({ [key]: checked })}
    />
  );

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = EXPORT_FILE_NAME;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (typeof parsed !== "object" || parsed === null || !("version" in parsed))
        throw new Error("not an export");
      setSettings(await store.save(normalizeSettings(parsed)));
      flash(t("optionsImported"));
    } catch {
      flash(t("optionsImportFailed"));
    }
  };

  return (
    <main class="options">
      <header class="page-head">
        <img src="/icon/128.png" width="40" height="40" alt="" />
        <div>
          <h1>{t("optionsTitle")}</h1>
          <p class="muted small">
            <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
              {t("popupPrivacy")}
            </a>
            {" · "}
            <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
              {t("popupSource")}
            </a>
            {" · "}v{browser.runtime.getManifest().version}
          </p>
        </div>
        <p class="saved small" role="status" aria-live="polite">
          {status}
        </p>
      </header>

      <Section title={t("optionsGeneral")}>
        {toggle("enabled", "enabled", t("optionsEnabled"), t("optionsEnabledHint"))}
        <div class="field column">
          <h3 class="label">{t("optionsDisabledSites")}</h3>
          {settings.disabledOrigins.length === 0 ? (
            <p class="muted small">{t("optionsDisabledSitesEmpty")}</p>
          ) : (
            <ul class="sites">
              {settings.disabledOrigins.map((origin) => (
                <li key={origin}>
                  <code>{origin}</code>
                  <button
                    class="button"
                    aria-label={`${t("optionsRemove")} ${origin}`}
                    onClick={() =>
                      void update({
                        disabledOrigins: settings.disabledOrigins.filter((item) => item !== origin),
                      })
                    }
                  >
                    {t("optionsRemove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title={t("optionsBehavior")}>
        {toggle(
          "strictAccept",
          "strict-accept",
          t("optionsStrictAccept"),
          t("optionsStrictAcceptHint"),
        )}
        {toggle(
          "triggerCapture",
          "trigger-capture",
          t("optionsTriggerCapture"),
          t("optionsTriggerCaptureHint"),
        )}
        {toggle(
          "pageFallback",
          "page-fallback",
          t("optionsPageFallback"),
          t("optionsPageFallbackHint"),
        )}
        {toggle(
          "closedShadowRoots",
          "closed-shadow",
          t("optionsClosedShadow"),
          t("optionsClosedShadowHint"),
        )}
        <div class="field">
          <div>
            <label for="force-modifier">{t("optionsForceModifier")}</label>
            <p id="force-modifier-hint" class="muted small">
              {t("optionsForceModifierHint")}
            </p>
          </div>
          <select
            id="force-modifier"
            aria-describedby="force-modifier-hint"
            value={settings.forceModifier}
            onChange={(event) =>
              void update({ forceModifier: event.currentTarget.value as ForceModifier })
            }
          >
            <option value="Alt">Alt / Option</option>
            <option value="Shift">Shift</option>
            <option value="none">{t("optionsModifierNone")}</option>
          </select>
        </div>
      </Section>

      <Section title={t("optionsAppearance")}>
        <div class="field">
          <label for="accent">{t("optionsAccent")}</label>
          <input
            id="accent"
            type="color"
            value={settings.accentColor}
            onChange={(event) => void update({ accentColor: event.currentTarget.value })}
          />
        </div>
        <div class="field">
          <label for="motion">{t("optionsMotion")}</label>
          <select
            id="motion"
            value={settings.reducedMotion}
            onChange={(event) =>
              void update({ reducedMotion: event.currentTarget.value as MotionPreference })
            }
          >
            <option value="system">{t("optionsMotionSystem")}</option>
            <option value="reduce">{t("optionsMotionReduce")}</option>
            <option value="allow">{t("optionsMotionAllow")}</option>
          </select>
        </div>
      </Section>

      <Section title={t("optionsAdvanced")}>
        {toggle("debug", "debug", t("optionsDebug"), t("optionsDebugHint"))}
        <div class="field buttons">
          <button class="button" onClick={exportSettings}>
            {t("optionsExport")}
          </button>
          <button class="button" onClick={() => importInput.current?.click()}>
            {t("optionsImport")}
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importSettings(event.currentTarget.files?.[0])}
          />
          <button class="button danger" onClick={() => void update({ ...DEFAULT_SETTINGS })}>
            {t("optionsReset")}
          </button>
        </div>
      </Section>
    </main>
  );
}
