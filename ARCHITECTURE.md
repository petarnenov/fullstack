# Architecture

## Why this repo exists

A micro-frontend POC for a realistic platform. Three product teams (Billing, Open Account, Trading) ship features into a shared shell owned by a Platform Core team. Each team can develop, build, and deploy independently.

## Team and package map

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Asset Management Platform                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   platform-shell    (Platform Core team)  :5173  HOST        │   │
│  │                                                              │   │
│  │   • Routing, navigation, theme                               │   │
│  │   • Auth (owns login, session, ProtectedRoute)               │   │
│  │   • Dashboard  ── composes 3 widgets from 3 MFEs             │   │
│  │   • /billing   ── lazy-loads remote BillingPage              │   │
│  │   • /accounts  ── lazy-loads remote OpenAccountPage          │   │
│  │   • /trading   ── lazy-loads remote TradingPage              │   │
│  └──────────────────────────────────────────────────────────────┘   │
│          │                  │                    │                  │
│          │  Module Federation (runtime composition)                 │
│          ▼                  ▼                    ▼                  │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐     │
│  │ mfe-billing   │  │ mfe-open-account │  │ mfe-trading      │     │
│  │ :5175  REMOTE │  │ :5174  REMOTE    │  │ :5176  REMOTE    │     │
│  │               │  │                  │  │                  │     │
│  │ exposes:      │  │ exposes:         │  │ exposes:         │     │
│  │  ./BillingPg  │  │  ./OpenAcctPg    │  │  ./TradingPage   │     │
│  │  ./Outstndng… │  │  ./OnbrdngPrgrs… │  │  ./PortfolioW…   │     │
│  └───────┬───────┘  └────────┬─────────┘  └────────┬─────────┘     │
│          │                   │                     │                │
│          │   HTTP (axios, same origin, Bearer)     │                │
│          ▼                   ▼                     ▼                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   api     :3000   (shared service, domain-split)              │   │
│  │                                                              │   │
│  │   /api/auth/*      →  auth.router     (Platform Core)        │   │
│  │   /api/billing/*   →  billing.router  (Billing, auth)        │   │
│  │   /api/accounts/*  →  accounts.router (Open Account, auth)   │   │
│  │   /api/trading/*   →  trading.router  (Trading, auth)        │   │
│  │   Swagger UI /api-docs  (all four domains)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Module Federation contracts

Each remote declares what it exposes in its `vite.config.ts`. The host pulls them by name at runtime.

| Remote             | Exposed module                 | Consumer in shell                  |
| ------------------ | ------------------------------ | ---------------------------------- |
| `mfe_billing`      | `./BillingPage`                | `/billing/*` route                 |
| `mfe_billing`      | `./OutstandingBalanceWidget`   | Dashboard tile                     |
| `mfe_open_account` | `./OpenAccountPage`            | `/accounts/*` route                |
| `mfe_open_account` | `./OnboardingProgressWidget`   | Dashboard tile                     |
| `mfe_trading`      | `./TradingPage`                | `/trading/*` route                 |
| `mfe_trading`      | `./PortfolioWidget`            | Dashboard tile                     |

The shell declares TypeScript ambient modules for these in `platform-shell/src/vite-env.d.ts` so imports are typed.

**Contract = the exposed name + its default-export component signature.** Nothing else crosses the boundary. No shared code, no shared types at build time. Types for the API are regenerated independently in each MFE from the same Swagger file.

## Authentication

Auth is a Platform Core concern — the shell owns it end-to-end. Neither MFE knows how login works; they only know how to read the current session.

```
┌─────────────────────────────────────────────────────────────┐
│ platform-shell                                              │
│                                                             │
│   AuthContext ─┬──► /api/auth/login (email + password)      │
│                ├──► /api/auth/me (bootstrap on reload)      │
│                └──► /api/auth/logout (revoke)               │
│                                                             │
│   installs on window.__AMP_PLATFORM__ = { getToken }        │
│   listens for window "amp:auth-expired" event               │
│                                                             │
│   ProtectedRoute gates /, /billing, /accounts, /settings    │
│   anonymous → <Navigate to="/login"/>                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ runtime contract (window bag)
┌──────────────────┴──────────────────────────────────────────┐
│ mfe-billing / mfe-open-account (each)                       │
│                                                             │
│   axios request interceptor:                                │
│     window.__AMP_PLATFORM__?.getToken?.()                   │
│       → Authorization: Bearer <token>                       │
│                                                             │
│   axios response interceptor:                               │
│     on 401 → dispatchEvent("amp:auth-expired")              │
└─────────────────────────────────────────────────────────────┘
```

**Contract surface between teams = one object shape + one event name.** Each MFE duplicates the `PlatformSdk` interface inline (see the comment in its `src/api/index.ts`) so there is zero build-time coupling between teams. When the shell wants to change the contract, it's a versioning conversation, not a coordinated rebuild.

**Why not federation-expose an SDK or use an import-map module?** Both are valid upgrades for production:

- Federation-exposed: shell declares `exposes: { "./auth": "./src/auth/platformSdk" }` and MFEs import `platform_shell/auth`. Type-safe, but inverts the usual remote→host direction and makes the MFEs' federation configs aware of the shell's existence.
- Import map / SystemJS: each team imports `@amp/platform-sdk` and the browser resolves the URL at runtime. Cleanest, but requires an import-map loader.

For a 30-minute talk the window bag is the minimum that teaches the right mental model (contract-first, zero build coupling). For production I'd pick federation-exposed.

**Backend.** `api/src/domains/auth/` issues opaque tokens from an in-memory session map (not JWT — POC). `api/src/shared/authMiddleware.ts` is applied to `/api/billing/*` and `/api/accounts/*`. Demo users are hardcoded and the login page autofills them via a demo-only `GET /api/auth/demo-credentials` endpoint that would not ship in production.

**Session persistence.** Token lives in `localStorage` under `amp.auth.token`. On boot, the shell calls `/api/auth/me` with the stored token; 401 clears it and redirects to `/login`. On login, the shell invalidates the entire React Query cache — every widget refetches under the new identity without extra wiring, thanks to the shared `QueryClient` singleton.

## Shared singletons

Declared in each package's federation config:

```ts
shared: ["react", "react-dom", "@tanstack/react-query"]
```

Consequences:

- Only one React instance across shell + remotes (required — otherwise hooks break).
- One `QueryClient` created by the shell serves both MFEs. An invalidation triggered in `mfe-billing` (after paying an invoice) refreshes the `OutstandingBalanceWidget` immediately — same cache, no wiring. Login/logout uses the same mechanism to force all widgets to refetch under the new identity.

## Independent development

Each MFE runs in three modes:

1. **Standalone dev** (`npm run dev:billing:standalone`) — full Vite dev server with HMR, own `QueryClient`, own `BrowserRouter`, shows widget preview + page. Useful for team-local work without the shell.
2. **Built preview** (`npm run dev:billing`) — `vite preview` of the built output. Serves `remoteEntry.js` so the shell can consume it.
3. **Consumed by shell** — rendered inside shell's layout with shell's providers (auth, query client, router).

## CSS

Both MFEs use CSS Modules + [`vite-plugin-css-injected-by-js`](https://github.com/Menci/vite-plugin-css-injected-by-js). The plugin inlines CSS into the federated JS bundle — without this, the shell would load `remoteEntry.js` but never request the remote's stylesheet. Each MFE also scopes its top-level container with `isolation: isolate` and a theme-color CSS variables scope so its look is predictable whether standalone or composed.

## API design

`packages/api` is a single Express process, split by domain:

- `src/domains/auth/` — login, sessions, `/me`, owned by Platform Core.
- `src/domains/billing/` — `billing.router.ts` + `billing.schemas.ts` (Zod) + `billing.repository.ts` (in-memory).
- `src/domains/accounts/` — parallel structure.
- `src/domains/trading/` — symbols, positions, orders, portfolio summary. Market orders fill instantly at the seeded last price; sell-more-than-held returns a `rejected` order (409).

Nothing is shared between domains beyond the HTTP server itself — each domain is a candidate for extraction into its own BFF later. Swagger document (`src/swagger.ts`) covers all domains with team-tagged operations.

## Type generation

One source of truth (Swagger) → two independent generated clients:

```
api/src/swagger.ts
        │
        ▼  tsx generateSwagger.ts
api/swagger.json
        │
        ├─→ platform-shell/src/api/generated/       (auth contract only)
        ├─→ mfe-billing/src/api/generated/          (via swagger-typescript-api)
        ├─→ mfe-open-account/src/api/generated/
        └─→ mfe-trading/src/api/generated/
```

Each package imports only the contract types it needs and uses plain axios for calls (see `src/api/index.ts`). The shell only fetches its own domain data (`/api/auth/*`) — all other data-fetching is owned by the team whose MFE renders the data.

## What's deliberately not included

- **No shared-ui package.** Design tokens are duplicated in each package's CSS. In production, a `@amp/design-tokens` workspace with CSS variables would be the first extraction.
- **No event bus / cross-MFE messaging.** All cross-MFE effects go through the shared `QueryClient` (cache invalidation) or the backend. If teams need imperative comms, a custom-events bus at the shell level is the next step.
- **No dynamic import-maps / runtime remote URL discovery.** Remote URLs are hard-coded in `platform-shell/vite.config.ts`. Production would inject these at build time or load a manifest.
- **No real IdP.** Auth uses opaque in-memory tokens + hardcoded demo users. Production swaps the `authRepository` for an OIDC / IdP integration and moves the token to an httpOnly cookie.
- **No persistence.** Repositories are in-memory arrays; data resets on API restart.

## Tech stack

- React 19, Vite 6, TypeScript 5, React Router 7, TanStack Query 5
- `@originjs/vite-plugin-federation` for Module Federation
- `vite-plugin-css-injected-by-js` for remote CSS
- Express 4, Zod, Swagger/OpenAPI 3
- `swagger-typescript-api` for client generation
- Jest + ts-jest for API tests
