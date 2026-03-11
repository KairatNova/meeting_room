import { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";

interface LayoutProps {
  children: React.ReactNode;
}

/** Отображаемое имя пользователя: имя или email */
function getUserDisplayName(user: { full_name: string; display_name?: string | null; email: string }): string {
  const name = (user.display_name || user.full_name || "").trim();
  return name || user.email;
}

/**
 * Общий layout: шапка с навигацией, выпадающее меню пользователя, контент страницы.
 */
export function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { lang, setLang, t } = useI18n();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropdownOpen]);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-blue-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="rounded-md bg-blue-700 px-2 py-1 text-sm font-semibold">
              MR
            </span>
            <span className="text-xl font-semibold tracking-tight">Meeting Rooms</span>
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                {user.is_admin && (
                  <Link
                    to="/admin"
                    className="hover:bg-blue-800 px-3 py-1.5 rounded-md transition-colors"
                  >
                    {t("nav", "admin")}
                  </Link>
                )}
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen((v) => !v)}
                    className="flex items-center gap-1.5 hover:bg-blue-800 px-3 py-2 rounded-md transition-colors border border-transparent focus:border-blue-300 outline-none"
                    aria-expanded={dropdownOpen}
                    aria-haspopup="true"
                  >
                    <span className="max-w-[160px] sm:max-w-[200px] truncate font-medium">
                      {getUserDisplayName(user)}
                    </span>
                    <svg
                      className={`w-4 h-4 shrink-0 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 top-full mt-1 py-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 text-gray-800 z-50"
                      role="menu"
                    >
                      <Link
                        to="/profile"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-100 rounded-t-lg"
                      >
                        Мои данные
                      </Link>
                      <Link
                        to="/my-bookings"
                        role="menuitem"
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm hover:bg-gray-100"
                      >
                        Мои бронирования
                      </Link>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 rounded-b-lg"
                      >
                        Выйти
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hover:bg-blue-800 px-3 py-1.5 rounded-md transition-colors"
                >
                  {t("nav", "login")}
                </Link>
                <Link
                  to="/register"
                  className="bg-white text-blue-900 font-semibold px-3 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
                >
                  {t("nav", "register")}
                </Link>
              </>
            )}
            <div className="ml-2 flex items-center gap-1 border border-blue-500/60 rounded-md overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setLang("ru")}
                className={`px-2 py-1 ${lang === "ru" ? "bg-white text-blue-900" : "bg-transparent text-blue-100"}`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-1 ${lang === "en" ? "bg-white text-blue-900" : "bg-transparent text-blue-100"}`}
              >
                EN
              </button>
            </div>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="mt-8 border-t border-slate-200 bg-white/80">
        <div className="max-w-6xl mx-auto px-4 py-6 text-xs sm:text-sm text-slate-500 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="space-x-3">
            <span className="font-semibold text-slate-700">Meeting Rooms</span>
            <span>© {new Date().getFullYear()} Все права защищены.</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <span>Учебный проект: бронирование переговорных комнат</span>
            <span className="hidden sm:inline-block">•</span>
            <span>Backend: FastAPI + PostgreSQL</span>
            <span className="hidden sm:inline-block">•</span>
            <span>Frontend: React + Vite + Tailwind</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
