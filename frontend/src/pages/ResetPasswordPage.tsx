import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { ApiError } from "../api/client";

export function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const emailFromState = (location.state as { email?: string } | null)?.email;

  const [email, setEmail] = useState(emailFromState ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Укажите email");
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
        email: email.trim(),
        reset_code: code.trim(),
        new_password: password,
      });
      setMessage(res.message);
      // после успешного сброса можно отправить на страницу логина
      navigate("/login", {
        replace: true,
        state: { message: "Пароль изменён. Войдите с новым паролем." },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка смены пароля");
    } finally {
      setLoading(false);
    }
  };

  const showEmailField = !emailFromState;

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Сброс пароля</h1>
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
        {showEmailField && (
          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        )}
        {!showEmailField && (
          <p className="text-sm text-gray-600">
            Код был отправлен на <strong>{emailFromState}</strong>
          </p>
        )}
        <div>
          <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 mb-1">
            Код из письма
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
            Новый пароль
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
          {loading ? "Сохранение…" : "Сменить пароль"}
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-600">
        Вспомнили пароль?{" "}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Войти
        </Link>
      </p>
    </div>
  );
}

