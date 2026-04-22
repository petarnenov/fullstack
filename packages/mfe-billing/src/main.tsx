import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

// Standalone-only: the shell normally owns auth and publishes
// window.__AMP_PLATFORM__. In `vite dev` we fake it by doing a real demo
// login — the API sets httpOnly access+refresh cookies automatically; we
// only need to stash the CSRF token so the axios interceptor can echo it
// as the X-CSRF-Token header on state-changing requests.
async function installStandaloneAuth() {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email: "admin@amp.demo", password: "admin123" }),
  });
  const { csrfToken } = (await res.json()) as { csrfToken: string };
  (window as unknown as {
    __AMP_PLATFORM__: { csrfToken: string };
  }).__AMP_PLATFORM__ = { csrfToken };
}

async function bootstrap() {
  if (import.meta.env.DEV) {
    await installStandaloneAuth();
  }
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
}

bootstrap();
