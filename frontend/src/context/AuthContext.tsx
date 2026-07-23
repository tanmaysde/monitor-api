import {
  createContext,
  FormEvent,
  ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";
import { AuthResponse, UserProfile } from "../types";

type AuthMode = "login" | "register";

type AuthContextValue = {
  authMode: AuthMode;
  setAuthMode: (mode: AuthMode) => void;
  authError: string;
  authBusy: boolean;
  token: string | null;
  user: UserProfile | null;
  login: (input: { email: string; password: string }) => Promise<AuthResponse>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<AuthResponse>;
  completeAuth: (response: AuthResponse) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "api-monitor-token";
const USER_KEY = "api-monitor-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY)
  );
  const [user, setUser] = useState<UserProfile | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  });

  const completeAuth = (response: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    setToken(response.token);
    setUser(response.user);
    setAuthError("");
  };

    const logout = () => {
    // 1. Tell backend to clear HTTP-Only cookie
    api.logout().catch(() => {}); 
    
    // 2. Clear local storage states
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setAuthError("");
  };


  const value = useMemo<AuthContextValue>(
    () => ({
      authMode,
      setAuthMode,
      authError,
      authBusy,
      token,
      user,
      async login(input) {
        setAuthBusy(true);
        setAuthError("");
        try {
          const response = await api.login(input);
          completeAuth(response);
          return response;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Login failed";
          setAuthError(message);
          throw error;
        } finally {
          setAuthBusy(false);
        }
      },
      async register(input) {
        setAuthBusy(true);
        setAuthError("");
        try {
          const response = await api.register(input);
          completeAuth(response);
          return response;
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Registration failed";
          setAuthError(message);
          throw error;
        } finally {
          setAuthBusy(false);
        }
      },
      completeAuth,
      logout,
    }),
    [authBusy, authError, authMode, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
