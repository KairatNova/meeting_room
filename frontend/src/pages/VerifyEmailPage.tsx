import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

/**
 * Страница ввода кода подтверждения email.
 * Email передаётся через state при редиректе с регистрации или с логина (403).
 */
export function VerifyEmailPage() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = (location.state as { email?: string } | null)?.email;
  const [email, setEmail] = useState(emailFromState ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedCode = code.replace(/\D/g, "").slice(0, 6);
    if (trimmedCode.length !== 6) {
      setError("Введите 6-значный код из письма");
      return;
    }
    if (!email.trim()) {
      setError("Укажите email");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyEmail(email.trim(), trimmedCode);
      // Сохраняем токен и сразу считаем пользователя залогиненным
      localStorage.setItem("access_token", res.access_token);
      // Проще всего перезагрузить приложение, AuthProvider подтянет пользователя по токену
      navigate("/", { replace: true });
      window.location.reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("common", "error"));
    } finally {
      setLoading(false);
    }
  };

  const displayEmail = emailFromState ?? email;
  const showEmailField = !emailFromState;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-2">{t("auth", "verifyTitle")}</h1>
      <p className="text-gray-600 text-sm mb-4">
        {t("auth", "verifyHint")}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm" role="alert">
            {error}
          </div>
        )}
        {showEmailField && (
          <div>
            <label htmlFor="verify-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="verify-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="user@example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
        {!showEmailField && (
          <p className="text-sm text-gray-600">
            Код отправлен на <strong>{displayEmail}</strong>
          </p>
        )}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            {t("auth", "resetCode")}
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            placeholder="123456"
            className="w-full border border-gray-300 rounded px-3 py-2 text-center text-lg tracking-widest focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? t("auth", "verifying") : t("auth", "verifyCode")}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Не пришло письмо? Проверьте папку «Спам» или{" "}
        <Link to="/register" className="text-indigo-600 hover:underline">зарегистрируйтесь снова</Link>.
      </p>
      <p className="mt-2 text-sm text-gray-600">
        <Link to="/login" className="text-indigo-600 hover:underline">{t("auth", "signIn")}</Link>
      </p>
    </div>
  );
}
