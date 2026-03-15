import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

export function ForgotPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [login, setLogin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    const value = login.trim();
    try {
      const payload = value.includes("@")
        ? { email: value, telegram: null }
        : { email: null, telegram: value };
      const res = await authApi.forgotPassword(payload);
      setMessage(res.message);
      navigate("/reset-password", {
        replace: true,
        state: { login: value },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common", "error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t("auth", "forgotTitle")}</h1>
      <p className="text-sm text-gray-600 mb-4">
        {t("auth", "forgotHint")}
      </p>
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
        <div>
          <label htmlFor="forgot-login" className="block text-sm font-medium text-gray-700 mb-1">
            Email или Telegram-ник
          </label>
          <input
            id="forgot-login"
            type="text"
            placeholder="email@example.com или @username"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? t("auth", "sending") : t("auth", "sendCode")}
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

