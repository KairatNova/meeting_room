import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../api/auth";
import type { User } from "../types/api";
import type { RegisterResponse, LoginRequestResponse } from "../types/api";

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /** Регистрация: имя, Telegram (@username или номер), почта, пароль. Код приходит в Telegram. */
  register: (fullName: string, telegram: string, email: string, password: string) => Promise<RegisterResponse>;
  /** Шаг 1 входа с кодом: отправить код в Telegram/email. */
  loginRequest: (login: string, password: string) => Promise<LoginRequestResponse>;
  /** Шаг 2: ввести код и войти. */
  loginVerify: (login: string, code: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "access_token";

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setState({ user: null, loading: false });
      return;
    }
    try {
      const user = await authApi.me();
      setState({ user: user ?? null, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await authApi.login({ email, password });
      localStorage.setItem(TOKEN_KEY, access_token);
      await loadUser();
    },
    [loadUser]
  );

  const register = useCallback(
    async (
      fullName: string,
      telegram: string,
      email: string,
      password: string
    ): Promise<RegisterResponse> => {
      const res = await authApi.register({
        full_name: fullName,
        telegram: telegram.trim(),
        email,
        password,
      });
      return res;
    },
    []
  );

  const loginRequest = useCallback(async (login: string, password: string) => {
    return authApi.loginRequest({ login: login.trim(), password });
  }, []);

  const loginVerify = useCallback(
    async (login: string, code: string) => {
      const res = await authApi.loginVerify({
        login: login.trim(),
        verification_code: code.trim(),
      });
      localStorage.setItem(TOKEN_KEY, res.access_token);
      setState({
        user: {
          id: res.user.id,
          email: res.user.email,
          full_name: res.user.name,
          display_name: res.user.name,
          is_admin: false,
        },
        loading: false,
      });
      await loadUser();
    },
    [loadUser]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, loading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    loginRequest,
    loginVerify,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
