import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginRequest, meRequest } from "../api/auth.api";
import { clearStoredToken, getStoredToken, storeToken } from "../api/http";
import type { AuthUser, LoginRequest } from "../types/api.types";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isRestoringSession: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isRestoringSession, setIsRestoringSession] = useState(true);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setIsRestoringSession(false);
      return;
    }

    meRequest()
      .then((currentUser: AuthUser) => {
        setUser(currentUser);
      })
      .catch(() => {
        clearStoredToken();
        setUser(null);
      })
      .finally(() => {
        setIsRestoringSession(false);
      });
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await loginRequest(credentials);
    storeToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isRestoringSession,
      login,
      logout,
    }),
    [user, isRestoringSession, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }

  return context;
}