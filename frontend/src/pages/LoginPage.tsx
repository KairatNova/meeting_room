import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

/**
 * Страница входа: email, пароль, вызов login() и редирект.
 * При 403 «Подтвердите email» — редирект на страницу ввода кода.
 */
export function LoginPage() {
  const { t } = useI18n();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message.includes("Подтвердите email")) {
        navigate("/verify-email", { state: { email }, replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : t("auth", "loginError"));
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t("auth", "loginTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {successMessage && (
          <div className="bg-green-50 text-green-800 px-3 py-2 rounded text-sm" role="status">
            {successMessage}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded" role="alert">
            {error}
          </div>
        )}
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
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth", "password")}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          {t("auth", "signIn")}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {t("auth", "noAccount")} <Link to="/register" className="text-indigo-600 hover:underline">{t("auth", "signUp")}</Link>
      </p>
      <p className="mt-2 text-sm text-gray-600">
        <Link to="/forgot-password" className="text-indigo-600 hover:underline">
          {t("auth", "forgotPassword")}
        </Link>
      </p>
    </div>
  );
}
