# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **Module Federation micro-frontend POC** for an asset-management platform, modelling three independent teams on top of a single Java monolith backend. It is not a production system — it is a 30-minute live demo. Optimise decisions for demo clarity and developer readability, not production hardening. See `DEMO_SCRIPT.md` for the live-walkthrough flow and `ARCHITECTURE.md` for the full design.

## Package / team map

| Team               | Package                          | Port | Role                                                  |
| ------------------ | -------------------------------- | ---- | ----------------------------------------------------- |
| Platform Core      | `@amp/platform-shell`            | 5173 | Host; composes remotes                                |
| Billing            | `@amp/mfe-billing`               | 5175 | Remote                                                |
| Open Account       | `@amp/mfe-open-account`          | 5174 | Remote                                                |
| Trading            | `@amp/mfe-trading`               | 5176 | Remote                                                |
| _(shared service)_ | `@amp/api-java`                  | 8088 | Tomcat WAR (Struts2 + Akka + Hibernate), domain-split |
| _(tooling)_        | `@amp/swagger`                   | —    | Hand-maintained OpenAPI doc + codegen for all 4 FE    |

## Commands

All commands run from the repo root.

- `npm run dev` — regenerates types, builds both MFE remotes, starts the Java backend + all three remote previews + shell dev. The built-preview step is mandatory because `remoteEntry.js` only exists after build.
- `npm run dev:api-java` / `dev:shell` / `dev:billing` / `dev:accounts` / `dev:trading` — run a single piece. `dev:billing`, `dev:accounts`, `dev:trading` use **`vite preview`** (serving the built bundle) so federation still works. For team-local iteration with HMR use `dev:billing:standalone` / `dev:accounts:standalone` / `dev:trading:standalone` (pure `vite dev`).
- `npm run generate:types` — delegates to `@amp/swagger`: runs `tsx src/generateSwagger.ts` to refresh `swagger.json`, then `swagger-typescript-api` emits `src/api/generated/` into the shell and all three MFE packages independently.
- `npm run build` — `generate:types` → `build:billing` → `build:accounts` → `build:trading` → `build:shell`. Order matters: the shell's dev config points at `http://localhost:5175/`, `:5174/` and `:5176/` `remoteEntry.js`, so the remotes must exist before the shell boots. The Java WAR is built separately via the `api-java` Makefile (`make build` / `make start`).
- LAN demo mode: set `PUBLIC_HOST=<LAN IP>` in `/.env` (repo root; gitignored — see `.env.example`) and `npm run dev`. The shell's `vite.config.ts` calls `loadEnv(mode, REPO_ROOT, "")` and composes remote URLs from `PUBLIC_HOST` (defaults to `localhost`). Every vite server binds `host: true`. API proxy target stays `localhost:8088` because the proxy runs on the dev machine, not in the browser. Restart `npm run dev` after editing `.env` — the shell reads it at config time.
- Java backend requires `TOMCAT_HOME` in `/.env` pointing at a Tomcat 9 install. `scripts/dev-api-java.sh` skips cleanly (tail -f /dev/null) if unset or if :8088 is already taken, so `concurrently -k --kill-others-on-fail` doesn't tear down the whole stack.

## Load-bearing architectural constraints

If you break these, the demo breaks.

### 1. Shared singletons are non-negotiable
Every federation config declares `shared: ["react", "react-dom", "@tanstack/react-query"]`. Two instances of React across host/remote breaks hooks. The shared `QueryClient` is the cross-MFE communication channel — invalidations in `mfe-billing` refresh widgets composed in the shell without any explicit wiring. When adding a new shared dependency, add it in **all three** frontend `vite.config.ts` files.

### 2. Contract = exposed module name + component signature (props included)
Nothing else crosses team boundaries. No shared code package. No shared TypeScript types at build time. Each MFE regenerates its own client from the same Swagger. When the shell imports `mfe_billing/OutstandingBalanceWidget`, it expects a default-export React component; when it imports `mfe_open_account/OpenAccountPage`, it expects a default-export component that accepts `{ billingSlot?: ReactNode }`. The matching TypeScript ambient declaration lives in `platform-shell/src/vite-env.d.ts` — **add/update a declaration whenever you expose a new module or change an exposed component's props**. Two composition patterns are in use:

1. **Orchestration** (`DashboardPage`): the shell lazy-imports widgets from multiple MFEs and assembles a surface.
2. **Slot composition** (`OpenAccountPage.billingSlot`): an MFE page reserves a `ReactNode` prop; the shell fills it with a widget from another MFE. The hosting MFE must have **zero imports** from the other MFE — composition happens only at the shell layer. Always wrap slot content in an inner `<MfeBoundary>` inside the shell so the hosting page survives if the guest remote fails.

### 3. Remote CSS must be inlined in JS
Both MFE vite configs use `vite-plugin-css-injected-by-js`. Vite's federation plugin does **not** load separate CSS files from remotes. Without the plugin, federated components mount unstyled. Don't remove it; don't split CSS out. Each MFE also uses `isolation: isolate` on its page/widget root to keep its look predictable whether standalone or composed.

### 4. The API is one Tomcat process, split by domain
`packages/api-java/backend/src/main/java/com/amp/{web,service,agent}/{auth,billing,accounts,trading}/` are parallel structures: a Struts Action per endpoint, an Akka `*Manager` Service, a `*Trait` reaction map, a `*Process` holding in-memory state (auth uses Hibernate + H2 + Flyway instead). Domains share nothing but the `AgentSystem` wiring in `atomatron/worker/agentsystem/AgentSystem.java`. When adding a new domain, copy the shape — don't introduce cross-domain imports.

### 5. Data ownership follows team ownership
Data-fetching lives in the MFE whose team owns the data. The shell only calls `/api/auth/*` (its own domain, Platform Core). For billing or accounts data, a widget from the owning team is composed into the shell; the shell does not reach past the contract.

### 6. Auth is shell-owned; MFEs read the session via a runtime contract
The shell writes a tiny SDK to `window.__AMP_PLATFORM__ = { getToken() }` when `AuthProvider` mounts. Each MFE's axios instance reads from it in a request interceptor and attaches `Authorization: Bearer <token>`. On a 401 response, the MFE dispatches `CustomEvent("amp:auth-expired")` on `window`; the shell listens and forces a logout + redirect. **Never** import auth code across packages — duplicate the `PlatformSdk` interface inline in each MFE (see the comment in `src/api/index.ts`). Protected route gating lives only in the shell's `<ProtectedRoute>` wrapper.

### 7. Swagger is the API contract SoT; Java must match it
`packages/swagger/src/swagger.ts` is hand-maintained OpenAPI 3.0 describing every endpoint. It generates the 4 frontend axios clients AND describes what `packages/api-java` must implement. When adding or changing an endpoint: update `swagger.ts`, regenerate types (`npm run generate:types`), then port the change in the Java tier (Struts action + manager + agent msg + process). The MFEs only see the contract — they never know whether Node or Java is serving it.

## Per-package gotchas

- **`platform-shell`**: React Compiler is on (`babel-plugin-react-compiler`) — avoid manual `useMemo`/`useCallback` unless a profiler says otherwise. TS ambient declarations for federated imports are in `src/vite-env.d.ts`; forgetting to add one turns a new exposed module into a red TS error. Cross-team slot composition is wired in `src/App.tsx` (e.g. `<OpenAccountPage billingSlot={...}>`); the shell is the only place allowed to bridge two MFEs. The vite proxy sends every `/api/*` request to `http://localhost:8088`.
- **`mfe-billing` / `mfe-open-account` / `mfe-trading`**: each has its own generated API client under `src/api/generated/`. Do not hand-edit; regenerate via `npm run generate:types` from root. Widgets and pages share the same `*Keys` query-key factory so cross-surface invalidation works. `mfe-open-account`'s `OpenAccountPage` accepts an optional `billingSlot?: ReactNode` — the shell fills it with a Billing widget; Open Account must never import from `mfe_billing`.
- **`api-java`**: `BillingProcess`, `AccountsProcess`, `TradingProcess` hold in-memory state that resets on every Tomcat restart (mirrors the pre-Java Node contract). Auth uses Hibernate + H2 + Flyway migrations at `db_migrations/MIGRATIONS/` because sessions need to survive request boundaries. The seeded data is hand-crafted to make the widgets look non-trivial in demos (overdue invoice, KYC-pending account, unrealised PnL across positions, etc.). Don't "clean up" the seed data without checking the demo script still makes sense. Trading orders are instant-fill at the seeded `lastPrice` — don't introduce real matching logic.
- **`swagger`**: pure data + a `tsx` generator. No runtime server. When adding an endpoint, add it here FIRST — the frontend types propagate via `npm run generate:types`; the Java tier is a separate manual step.
- **Trading cash ledger**: lives in `TradingProcess.CASH_LEDGER` as a `Map<String, Double>`, seeded at `INITIAL_CASH_USD` (1,000,000) for 4 known accounts and lazy-initialised to 1M for any new `accountId`. Buys debit, sells credit, over-buy/over-sell → `rejected` order (409) without mutating state. `accountId` is the shared convention across Billing + Accounts + Trading — don't introduce cross-domain imports; each team owns its own slice of what "an account" is.
- **Struts ActionMapper**: a custom `MultiSegmentActionMapper` (in `com.amp.web.common`) replaces the default, because the default truncates action names at the last slash and breaks REST-style wildcards like `invoices/*` and `invoices/*/pay`. When the URL equals a declared namespace (e.g. bare `/api/accounts`), the mapper emits `index` as the action name so the literal `index` action wins over the sibling `*` wildcard. Any new collection endpoint that serves `/<ns>` directly must declare `<action name="index">`.

## Swagger → types flow

```
packages/swagger/src/swagger.ts          (hand-written OpenAPI doc, SoT)
           │
           ▼
packages/swagger/swagger.json            (generated by generateSwagger.ts)
           │
           ├──► platform-shell/src/api/generated/       (auth contract only)
           ├──► mfe-billing/src/api/generated/
           ├──► mfe-open-account/src/api/generated/
           └──► mfe-trading/src/api/generated/
```

The generated files contain `@ts-nocheck` at the top (swagger-typescript-api convention). Consumers in each frontend import only the contract types via their own `src/api/index.ts` (or `src/auth/authApi.ts` in the shell), which wraps a plain axios client and defines the `*Keys` query-key factory.

## What is deliberately NOT here

Don't add these without checking first:

- No shared-ui package. Design tokens are duplicated across packages' CSS.
- No event bus. Cross-MFE communication goes through the shared `QueryClient` (cache invalidation) or the backend.
- No Node/Express backend. The branch previously had an `@amp/api` package with a mirror of the domains in TypeScript + Jest tests; it was deleted in favour of `@amp/api-java`, which is now the sole runtime backend.
- No real IdP. The Java `AuthProcess` reads hardcoded demo users from `db_migrations/MIGRATIONS/V20260422_00001_03__insert_demo_users.sql` with plaintext passwords and opaque tokens. Swap for OIDC + httpOnly cookies in prod. The `/api/auth/demo-credentials` endpoint is demo-only and must not ship.
- No frontend tests. No Java tests yet either — the previous Jest suite was dropped with `@amp/api`. UI and Java testing would be added by the consuming teams.

## Repo notes

- Numerous docs are consolidated into `ARCHITECTURE.md` and `DEMO_SCRIPT.md` at the root. The previous sprawl of `*.md` files (USAGE, PROP_RENAME_GUIDE, etc.) has been removed; don't re-add fragmented docs.
- Generated folders (`dist/`, `.__mf__temp/`, `src/api/generated/`, `packages/api-java/backend/build/`, `packages/api-java/tomcat/`) are gitignored or rewritten on every build — don't commit hand edits to them.
