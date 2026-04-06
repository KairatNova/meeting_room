import { Link } from "react-router-dom";
import { useI18n } from "../i18n/I18nContext";

const inactive =
  "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors";
const active =
  "inline-flex items-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white border border-blue-600 shadow-sm";

/** Переключатель «Мои данные» / «Мои бронирования» (под шапкой сайта). */
export function ProfileBookingsNav({ active: current }: { active: "profile" | "bookings" }) {
  const { t } = useI18n();
  return (
    <nav className="flex flex-wrap gap-2 mb-4" aria-label="Account">
      {current === "profile" ? (
        <span className={active} aria-current="page">
          {t("layout", "myData")}
        </span>
      ) : (
        <Link to="/profile" className={inactive}>
          {t("layout", "myData")}
        </Link>
      )}
      {current === "bookings" ? (
        <span className={active} aria-current="page">
          {t("layout", "myBookings")}
        </span>
      ) : (
        <Link to="/my-bookings" className={inactive}>
          {t("layout", "myBookings")}
        </Link>
      )}
    </nav>
  );
}
