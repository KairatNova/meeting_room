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
import type { RegisterResponse } from "../types/api";

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  /** Регистрация: код отправляется на email. Возвращает { message, email } для редиректа на страницу ввода кода. */
  register: (email: string, password: string, fullName: string) => Promise<RegisterResponse>;
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
    async (email: string, password: string, fullName: string): Promise<RegisterResponse> => {
      const res = await authApi.register({ email, password, full_name: fullName });
      return res;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, loading: false });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
