import { useState } from "preact/hooks";
import { t } from "@/src/shared/i18n";
import { PRIVACY_URL, REPOSITORY_URL } from "@/src/shared/links";

export function Welcome() {
  const [names, setNames] = useState<string[]>([]);

  return (
    <main class="welcome">
      <header>
        <img src="/icon/128.png" width="56" height="56" alt="" />
        <h1>{t("welcomeTitle")}</h1>
        <p class="lead">{t("welcomeLead")}</p>
      </header>

      <section class="demo" aria-labelledby="try-title">
        <h2 id="try-title">{t("welcomeTryTitle")}</h2>
        <p class="muted">{t("welcomeTryHint")}</p>
        <div class="demo-field">
          {/* A typical "button only" upload control: the real input is hidden. */}
          <label class="button primary" for="demo-input">
            Browse…
          </label>
          <input
            id="demo-input"
            type="file"
            multiple
            hidden
            onChange={(event) =>
              setNames([...(event.currentTarget.files ?? [])].map((file) => file.name))
            }
          />
          <span class="muted small" role="status" aria-live="polite">
            {names.length > 0 ? t("welcomeTryResult", names.join(", ")) : "No file chosen"}
          </span>
        </div>
      </section>

      <section class="facts">
        <article>
          <h2>{t("welcomePermissionTitle")}</h2>
          <p class="muted">{t("welcomePermissionBody")}</p>
        </article>
        <article>
          <h2>{t("welcomePrivacyTitle")}</h2>
          <p class="muted">{t("welcomePrivacyBody")}</p>
        </article>
      </section>

      <footer class="muted small">
        <a href={PRIVACY_URL} target="_blank" rel="noreferrer">
          {t("popupPrivacy")}
        </a>
        {" · "}
        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer">
          {t("popupSource")}
        </a>
        {" · "}
        <a href="/options.html">{t("popupOptions")}</a>
      </footer>
    </main>
  );
}
