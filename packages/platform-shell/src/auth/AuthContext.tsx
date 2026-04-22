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
  const prefix = `${CSRF_COOKIE}=`;
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
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

  // Deduplicate refresh attempts — a single tab can have several 401s in
  // flight at once (dashboard calls billing + accounts + trading in parallel);
  // all of them should wait on the same /refresh response.
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

  const doLogout = useCallback(async () => {
    const csrf = csrfRef.current ?? readCsrfCookie();
    if (csrf) {
      try {
        await authApi.logout(csrf);
      } catch {
        /* swallow — local state is the authoritative clear */
      }
    }
    clearSession();
  }, [clearSession]);

  // Publish the runtime SDK that federated MFEs read off window. A getter-
  // driven bag means fresh csrf values are observed without re-installing
  // the SDK (which would churn the window object on every rotation).
  useEffect(() => {
    const sdk: PlatformSdk = {
      get user() {
        return user;
      },
      get csrfToken() {
        return csrfRef.current;
      },
      logout: doLogout,
    };
    return installPlatformSdk(sdk);
  }, [user, doLogout]);

  // Bootstrap: try /me first. If the access cookie is gone but the refresh
  // cookie + csrf are still around, attempt a silent refresh before flipping
  // to anonymous. Every transition from bootstrapping runs through here once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.me();
        if (cancelled) return;
        const csrf = csrfRef.current ?? readCsrfCookie() ?? "";
        adoptSession(me, csrf);
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
    // Run once on mount — adoptSession / clearSession / tryRefresh all close
    // over queryClient which is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // MFEs dispatch amp:auth-expired when an /api call returns 401. Give it a
  // silent-refresh chance before tearing the session down.
  useEffect(() => {
    const onExpired = () => {
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
