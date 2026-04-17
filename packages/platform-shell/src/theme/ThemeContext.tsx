import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "amp.theme";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return prefersDark() ? "dark" : "light";
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode());
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolve(readStoredMode()),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  useEffect(() => {
    setResolved(resolve(mode));
    if (mode === "system") return;
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setResolved(media.matches ? "dark" : "light");
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    if (next === "system") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setModeState((current) => {
      const nextResolved = resolve(current) === "dark" ? "light" : "dark";
      window.localStorage.setItem(STORAGE_KEY, nextResolved);
      return nextResolved;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, toggle }),
    [mode, resolved, setMode, toggle],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
