import { useI18n } from "../i18n/I18nContext";
import { siteInfo } from "../config/siteInfo";

export function HelpPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6 max-w-4xl">
      <section className="app-card p-6">
        <h1 className="text-2xl font-semibold text-slate-900 mb-4">{t("help", "title")}</h1>
        <p className="text-slate-700">{t("help", "contactText")}</p>
      </section>

      <section className="app-card p-6" id="contact">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">{t("help", "contactTitle")}</h2>
        <div className="space-y-1 text-slate-700">
          <p>
            <span className="font-medium">{t("footer", "email")}:</span> {siteInfo.supportEmail}
          </p>
          <p>
            <span className="font-medium">{t("footer", "phone")}:</span> {siteInfo.supportPhone}
          </p>
          <p>
            <span className="font-medium">{t("footer", "address")}:</span> {siteInfo.address}
          </p>
        </div>
      </section>

      <section className="app-card p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">{t("help", "faqTitle")}</h2>
        <div className="space-y-4 text-slate-700">
          <div>
            <h3 className="font-medium text-slate-900">{t("help", "faq1q")}</h3>
            <p>{t("help", "faq1a")}</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900">{t("help", "faq2q")}</h3>
            <p>{t("help", "faq2a")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
