import { useI18n } from "../i18n/I18nContext";

export function HowToUsePage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="app-card p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">{t("footer", "howToUse")}</h1>
        <ol className="list-decimal pl-5 space-y-2 text-slate-700">
          <li>{t("help", "step1")}</li>
          <li>{t("help", "step2")}</li>
          <li>{t("help", "step3")}</li>
          <li>{t("help", "step4")}</li>
        </ol>
      </section>
    </div>
  );
}

