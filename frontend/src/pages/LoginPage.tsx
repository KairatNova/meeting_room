import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n/I18nContext";

/**
 * Вход: email или Telegram-ник + пароль → код в Telegram/email → ввод кода.
 * При 403 «Подтвердите email» — редирект на страницу ввода кода верификации.
 */
export function LoginPage() {
  const { t } = useI18n();
  const location = useLocation();
  const successMessage = (location.state as { message?: string } | null)?.message;
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"credentials" | "code">("credentials");
  const [channel, setChannel] = useState<"telegram" | "email">("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { loginRequest, loginVerify } = useAuth();
  const navigate = useNavigate();

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await loginRequest(login, password);
      setChannel(res.channel);
      setStep("code");
    } catch (err) {
      if (err instanceof ApiError && err.status === 403 && err.message.includes("Подтвердите")) {
        navigate("/verify-email", { state: { email: login }, replace: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : t("auth", "loginError"));
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginVerify(login, code);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("auth", "loginError"));
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
              Email или Telegram-ник
            </label>
            <input
              id="login"
              type="text"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="email@example.com или @username"
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
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
          >
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
