import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

export function ResetPasswordPage() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const loginFromState = (location.state as { login?: string } | null)?.login;

  const [login, setLogin] = useState(loginFromState ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!login.trim()) {
      setError("Укажите email или Telegram-ник");
      return;
    }
    if (!code.trim() || code.trim().length !== 6) {
      setError("Введите 6-значный код");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не менее 8 символов");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        login: login.trim(),
        reset_code: code.trim(),
        new_password: password,
      });
      setMessage(res.message);
      // после успешного сброса можно отправить на страницу логина
      navigate("/login", {
        replace: true,
        state: { message: t("auth", "passwordChangedLogin") },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common", "error"));
    } finally {
      setLoading(false);
    }
  };

  const showLoginField = !loginFromState;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t("auth", "resetTitle")}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <div className="bg-green-50 text-green-800 px-3 py-2 rounded text-sm" role="status">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm" role="alert">
            {error}
          </div>
        )}
        {showLoginField && (
          <div>
            <label htmlFor="reset-login" className="block text-sm font-medium text-gray-700 mb-1">
              Email или Telegram-ник
            </label>
            <input
              id="reset-login"
              type="text"
              placeholder="email@example.com или @username"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
        {!showLoginField && (
          <p className="text-sm text-gray-600">
            {t("auth", "resetCodeSent")} ({t("auth", "resetAccountLabel")}: <strong>{loginFromState}</strong>)
          </p>
        )}
        <div>
          <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth", "resetCode")}
          </label>
          <input
            id="reset-code"
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth", "newPassword")}
          </label>
          <input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? t("auth", "saving") : t("auth", "changePassword")}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        {t("auth", "rememberPassword")}{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          {t("auth", "signIn")}
        </Link>
      </p>
    </div>
  );
}

