import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

/**
 * Страница регистрации: email, пароль, имя, вызов register() и редирект.
 */
export function RegisterPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await register(
        email,
        password,
        fullName,
        telegramUsername.trim() || null
      );
      navigate("/verify-email", {
        state: { email: res.email, telegram_link: res.telegram_link ?? null },
        replace: true,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth", "registerError"));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t("auth", "registerTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded" role="alert">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth", "fullName")}
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="telegram" className="block text-sm font-medium text-gray-700 mb-1">
            Telegram (ник, необязательно)
          </label>
          <input
            id="telegram"
            type="text"
            placeholder="@username"
            value={telegramUsername}
            onChange={(e) => setTelegramUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Если укажете ник — код придёт только в Telegram. На следующем шаге откройте ссылку и нажмите «Start» в боте.
          </p>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth", "password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          <p className="text-xs text-gray-500 mt-1">Не менее 8 символов</p>
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          {t("auth", "signUp")}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {t("auth", "alreadyAccount")} <Link to="/login" className="text-indigo-600 hover:underline">{t("auth", "signIn")}</Link>
      </p>
    </div>
  );
}
