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
import {
  AUTH_EXPIRED_EVENT,
  installPlatformSdk,
  type PlatformSdk,
} from "./platformSdk";

export type PlatformUser = AuthenticatedUser;

type Status = "bootstrapping" | "anonymous" | "authenticated";

interface AuthContextValue {
  status: Status;
  user: PlatformUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const CSRF_COOKIE = "amp_csrf_token";
const AuthContext = createContext<AuthContextValue | null>(null);

function readCsrfCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CSRF_COOKIE}=`));
  return match ? decodeURIComponent(match.slice(CSRF_COOKIE.length + 1)) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [status, setStatus] = useState<Status>("bootstrapping");
  const csrfRef = useRef<string | null>(readCsrfCookie());
  const refreshInFlight = useRef<Promise<boolean> | null>(null);

  const clearSession = useCallback(() => {
    csrfRef.current = null;
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  const adoptSession = useCallback(
    (nextUser: PlatformUser, csrfToken: string) => {
      csrfRef.current = csrfToken;
      setUser(nextUser);
      setStatus("authenticated");
      queryClient.invalidateQueries();
    },
    [queryClient],
  );

  // Publish the runtime SDK that federated MFEs read off window. Keep the
  // ref-driven getter so fresh values are observed without re-rendering MFEs.
  useEffect(() => {
    const sdk: PlatformSdk = {
      get user() {
        return user;
      },
      get csrfToken() {
        return csrfRef.current;
      },
      logout: async () => {
        await doLogout();
      },
    };
    return installPlatformSdk(sdk);
    // doLogout captures clearSession via closure; exhaustive-deps would want
    // it listed, but re-installing the SDK on every render churns the window
    // object. The getter-based design means stale closure is OK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const tryRefresh = useCallback(async (): Promise<boolean> => {
    if (refreshInFlight.current) return refreshInFlight.current;
    const csrf = csrfRef.current ?? readCsrfCookie();
    if (!csrf) return false;
    const p = (async () => {
      try {
        const session = await authApi.refresh(csrf);
        adoptSession(session.user, session.csrfToken);
        return true;
      } catch {
        return false;
      } finally {
        refreshInFlight.current = null;
      }
    })();
    refreshInFlight.current = p;
    return p;
  }, [adoptSession]);

  // Bootstrap: try /me. If the access cookie is gone but refresh cookie + csrf
  // still exist, attempt a silent refresh before declaring the user anonymous.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.me();
        if (cancelled) return;
        adoptSession(me, csrfRef.current ?? readCsrfCookie() ?? "");
      } catch {
        if (cancelled) return;
        const recovered = await tryRefresh();
        if (cancelled) return;
        if (!recovered) clearSession();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adoptSession, clearSession, tryRefresh]);

  const doLogout = useCallback(async () => {
    const csrf = csrfRef.current;
    if (csrf) {
      try {
        await authApi.logout(csrf);
      } catch {
        /* swallow — local state is the authoritative clear */
      }
    }
    clearSession();
  }, [clearSession]);

  useEffect(() => {
    const onExpired = () => {
      if (!csrfRef.current) return;
      void (async () => {
        const recovered = await tryRefresh();
        if (!recovered) clearSession();
      })();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [clearSession, tryRefresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await authApi.login({ email, password });
      adoptSession(session.user, session.csrfToken);
    },
    [adoptSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout: doLogout }),
    [status, user, login, doLogout],
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
