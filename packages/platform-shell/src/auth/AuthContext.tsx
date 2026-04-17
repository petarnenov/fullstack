import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface PlatformUser {
  id: string;
  fullName: string;
  role: "admin" | "analyst" | "operator";
  tenantId: string;
}

interface AuthContextValue {
  user: PlatformUser;
}

const mockUser: PlatformUser = {
  id: "user_1",
  fullName: "Ivana Petrova",
  role: "operator",
  tenantId: "amp-demo",
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(() => ({ user: mockUser }), []);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
