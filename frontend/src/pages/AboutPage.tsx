import { useI18n } from "../i18n/I18nContext";

export function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="app-card p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-3">{t("about", "title")}</h1>
        <p className="text-slate-700">{t("about", "intro")}</p>
      </section>

      <section className="app-card p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">{t("about", "missionTitle")}</h2>
        <p className="text-slate-700">{t("about", "missionText")}</p>
      </section>

      <section className="app-card p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-3">{t("about", "featuresTitle")}</h2>
        <ul className="list-disc pl-5 space-y-2 text-slate-700">
          <li>{t("about", "feature1")}</li>
          <li>{t("about", "feature2")}</li>
          <li>{t("about", "feature3")}</li>
          <li>{t("about", "feature4")}</li>
        </ul>
      </section>
    </div>
  );
}
