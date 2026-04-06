import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

/**
 * Вход: email или Telegram-ник/номер + пароль -> код в Telegram -> ввод кода.
 * При 403 «Подтвердите email» — редирект на страницу ввода кода верификации.
 */
export function LoginPage() {
  const { t } = useI18n();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message;
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [loadingCode, setLoadingCode] = useState(false);
  const { loginRequest, loginVerify } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingCredentials(true);
    try {
      await loginRequest(login, password);
      setStep("code");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message.includes("Подтвердите")) {
        navigate("/verify-email", { state: { email: login }, replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : t("auth", "loginError"));
    } finally {
      setLoadingCredentials(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingCode(true);
    try {
      await loginVerify(login, code);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth", "loginError"));
    } finally {
      setLoadingCode(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">{t("auth", "loginTitle")}</h1>
      {successMessage && (
        <div className="bg-green-50 text-green-800 px-3 py-2 rounded text-sm mb-4" role="status">
          {successMessage}
        </div>
      )}

      {step === "credentials" && (
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded" role="alert">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="login" className="block text-sm font-medium text-gray-700 mb-1">
              Email, Telegram-ник или номер
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="email@example.com, @username или +79991234567"
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
            disabled={loadingCredentials}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loadingCredentials && (
              <span className="inline-block w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            )}
            {t("auth", "signIn")}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleCodeSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded" role="alert">
              {error}
            </div>
          )}
          <p className="text-sm text-gray-600">
            {t("auth", "loginHint")} Введите код ниже.
          </p>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
              Код подтверждения
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={loadingCode}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {loadingCode && (
              <span className="inline-block w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
            )}
            Войти
          </button>
          <button
            type="button"
            onClick={() => { setStep("credentials"); setCode(""); setError(null); }}
            className="w-full text-gray-600 text-sm hover:underline"
          >
            ← Другой логин или пароль
          </button>
        </form>
      )}

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
