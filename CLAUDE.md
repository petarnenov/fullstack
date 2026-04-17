# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A **Module Federation micro-frontend POC** for an asset-management platform, modelling three independent teams. It is not a production system — it is a 30-minute live demo. Optimise decisions for demo clarity and developer readability, not production hardening. See `DEMO_SCRIPT.md` for the live-walkthrough flow and `ARCHITECTURE.md` for the full design.

## Package / team map

| Team               | Package                          | Port | Role                       |
| ------------------ | -------------------------------- | ---- | -------------------------- |
| Platform Core      | `@amp/platform-shell`            | 5173 | Host; composes remotes     |
| Billing            | `@amp/mfe-billing`               | 5175 | Remote                     |
| Open Account       | `@amp/mfe-open-account`          | 5174 | Remote                     |
| _(shared service)_ | `@amp/api`                       | 3000 | Express, domain-split      |

## Commands

All commands run from the repo root.

- `npm run dev` — regenerates types, builds both MFE remotes, starts api + both remote previews + shell dev. The built-preview step is mandatory because `remoteEntry.js` only exists after build.
- `npm run dev:api` / `dev:shell` / `dev:billing` / `dev:accounts` — run a single piece. `dev:billing` and `dev:accounts` use **`vite preview`** (serving the built bundle) so federation still works. For team-local iteration with HMR use `dev:billing:standalone` / `dev:accounts:standalone` (pure `vite dev`).
- `npm run generate:types` — delegates to `@amp/api`: runs `tsx src/generateSwagger.ts` to refresh `swagger.json`, then `swagger-typescript-api` emits `src/api/generated/` into **both** MFEs independently. The shell does not consume the API and is not a generation target.
- `npm test` — Jest in `@amp/api` (repository unit tests). No frontend tests in this POC.
- `npm run build` — `build:api` → `build:billing` → `build:accounts` → `build:shell`. Order matters: the shell's dev config points at `http://localhost:5175/assets/remoteEntry.js` and `:5174`, so the remotes must exist before the shell boots.

## Load-bearing architectural constraints

If you break these, the demo breaks.

### 1. Shared singletons are non-negotiable
Every federation config declares `shared: ["react", "react-dom", "@tanstack/react-query"]`. Two instances of React across host/remote breaks hooks. The shared `QueryClient` is the cross-MFE communication channel — invalidations in `mfe-billing` refresh widgets composed in the shell without any explicit wiring. When adding a new shared dependency, add it in **all three** frontend `vite.config.ts` files.

### 2. Contract = exposed module name + component signature
Nothing else crosses team boundaries. No shared code package. No shared TypeScript types at build time. Each MFE regenerates its own client from the same Swagger. When the shell imports `mfe_billing/OutstandingBalanceWidget`, it expects a default-export React component, full stop. The matching TypeScript ambient declaration lives in `platform-shell/src/vite-env.d.ts` — **add a declaration whenever you expose a new module from a remote**.

### 3. Remote CSS must be inlined in JS
Both MFE vite configs use `vite-plugin-css-injected-by-js`. Vite's federation plugin does **not** load separate CSS files from remotes. Without the plugin, federated components mount unstyled. Don't remove it; don't split CSS out. Each MFE also uses `isolation: isolate` on its page/widget root to keep its look predictable whether standalone or composed.

### 4. The API is one process, split by domain
`packages/api/src/domains/billing/` and `.../accounts/` are parallel structures: `*.router.ts`, `*.schemas.ts` (Zod), `*.repository.ts` (in-memory). Domains share nothing but the Express app wiring. When adding a third domain, copy the shape — don't introduce cross-domain imports.

### 5. Data ownership follows team ownership
Data-fetching lives in the MFE whose team owns the data. The shell never calls the API. If a shell page needs data, a widget from the owning team is composed in; the shell does not reach past the contract.

## Per-package gotchas

- **`platform-shell`**: React Compiler is on (`babel-plugin-react-compiler`) — avoid manual `useMemo`/`useCallback` unless a profiler says otherwise. TS ambient declarations for federated imports are in `src/vite-env.d.ts`; forgetting to add one turns a new exposed module into a red TS error.
- **`mfe-billing` / `mfe-open-account`**: each has its own generated API client under `src/api/generated/`. Do not hand-edit; regenerate via `npm run generate:types` from root. Widgets and pages share the same `*Keys` query-key factory so cross-surface invalidation works.
- **`api`**: repositories are in-memory and reset on every restart. The seeded data is hand-crafted to make the widgets look non-trivial in demos (overdue invoice, KYC-pending account, etc.). Don't "clean up" the seed data without checking the demo script still makes sense.

## Swagger → types flow

```
api/src/swagger.ts    (hand-written OpenAPI doc, SoT)
       │
       ▼
api/swagger.json      (generated by generateSwagger.ts)
       │
       ├──► mfe-billing/src/api/generated/
       └──► mfe-open-account/src/api/generated/
```

The generated files contain `@ts-nocheck` at the top (swagger-typescript-api convention). Consumers in each MFE import only the contract types via `src/api/index.ts`, which also defines the axios client and the `*Keys` query-key factory.

## What is deliberately NOT here

Don't add these without checking first:

- No shared-ui package. Design tokens are duplicated across packages' CSS.
- No event bus. Cross-MFE communication goes through the shared `QueryClient` (cache invalidation) or the backend.
- No SQLite / persistence. Previously there was a repository pattern with memory + sqlite + test implementations — it was removed as unnecessary complexity for a demo.
- No auth provider. `AuthContext` returns a fixed mock user.
- No frontend tests. API tests exist; UI testing would be added by the consuming team.

## Repo notes

- Numerous docs are consolidated into `ARCHITECTURE.md` and `DEMO_SCRIPT.md` at the root. The previous sprawl of `*.md` files (USAGE, PROP_RENAME_GUIDE, etc.) has been removed; don't re-add fragmented docs.
- Generated folders (`dist/`, `.__mf__temp/`, `src/api/generated/`) are gitignored or rewritten on every build — don't commit hand edits to them.
