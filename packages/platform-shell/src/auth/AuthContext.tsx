import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authApi, type AuthenticatedUser } from "./authApi";
import { AUTH_EXPIRED_EVENT, installPlatformSdk } from "./platformSdk";

export type PlatformUser = AuthenticatedUser;

type Status = "bootstrapping" | "anonymous" | "authenticated";

interface AuthContextValue {
  status: Status;
  user: PlatformUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const TOKEN_KEY = "amp.auth.token";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [status, setStatus] = useState<Status>(() =>
    readStoredToken() ? "bootstrapping" : "anonymous",
  );
  const tokenRef = useRef<string | null>(readStoredToken());

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    window.localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  const persistSession = useCallback(
    (token: string, nextUser: PlatformUser) => {
      tokenRef.current = token;
      window.localStorage.setItem(TOKEN_KEY, token);
      setUser(nextUser);
      setStatus("authenticated");
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  useEffect(() => {
    return installPlatformSdk({ getToken: () => tokenRef.current });
  }, []);

  useEffect(() => {
    const onExpired = () => {
      if (tokenRef.current) clearSession();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  useEffect(() => {
    const existing = tokenRef.current;
    if (!existing) return;
    let cancelled = false;
    authApi
      .me(existing)
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, user: nextUser } = await authApi.login({ email, password });
      persistSession(token, nextUser);
    },
    [persistSession],
  );

  const logout = useCallback(async () => {
    const token = tokenRef.current;
    if (token) {
      try {
        await authApi.logout(token);
      } catch {
        /* swallow — local state is the authoritative clear */
      }
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout }),
    [status, user, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useAuthenticatedUser(): PlatformUser {
  const { user, status } = useAuth();
  if (status !== "authenticated" || !user) {
    throw new Error(
      "useAuthenticatedUser called outside an authenticated route — wrap the tree in <ProtectedRoute>.",
    );
  }
  return user;
}
