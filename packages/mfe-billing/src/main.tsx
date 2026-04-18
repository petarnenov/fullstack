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
// window.__AMP_PLATFORM__. In `vite dev` we fake it with a demo login so the
// axios interceptor can attach a Bearer token to /api/billing/* calls.
async function installStandaloneAuth() {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@amp.demo", password: "admin123" }),
  });
  const { token } = (await res.json()) as { token: string };
  (window as unknown as { __AMP_PLATFORM__: { getToken: () => string } }).__AMP_PLATFORM__ =
    { getToken: () => token };
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
