import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

/**
 * Главная: hero-блок и «поисковая» панель как на booking.
 */
export function HomePage() {
  const { t } = useI18n();
  return (
    <div className="space-y-8">
      {/* Hero-блок */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-900 to-blue-700 text-white px-6 py-10 shadow-lg">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          {t("home", "title")}
        </h1>
        <p className="text-blue-100 max-w-2xl mb-6">{t("home", "subtitle")}</p>

        {/* Поисковая панель */}
        <div className="bg-white rounded-xl shadow-md p-4 flex flex-col md:flex-row gap-3 text-gray-800">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t("home", "date")}
            </label>
            <input
              type="date"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t("home", "timeStart")}
            </label>
            <input
              type="time"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t("home", "timeEnd")}
            </label>
            <input
              type="time"
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {t("home", "people")}
            </label>
            <input
              type="number"
              min={1}
              className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-end">
            <Link
              to="/rooms"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-md px-6 py-2.5 text-sm text-center transition-colors"
            >
              {t("home", "search")}
            </Link>
          </div>
        </div>
      </section>

      {/* Подборка комнат / CTA */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("home", "listTitle")}
        </h2>
        <p className="text-gray-600">{t("home", "listSubtitle")}</p>
        <div className="flex gap-4 flex-wrap">
          <Link
            to="/rooms"
            className="bg-white border border-gray-200 shadow-sm text-gray-800 px-6 py-3 rounded-lg hover:shadow-md hover:border-blue-500 transition-all text-sm font-medium"
          >
            {t("home", "openRooms")}
          </Link>
          <Link
            to="/login"
            className="text-sm text-blue-700 hover:underline self-center"
          >
            {t("home", "loginToSee")}
          </Link>
        </div>
      </section>
    </div>
  );
}
