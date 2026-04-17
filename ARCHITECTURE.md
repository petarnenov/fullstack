# Architecture

## Why this repo exists

A micro-frontend POC for a realistic platform. Two product teams (Billing, Open Account) ship features into a shared shell owned by a Platform Core team. Each team can develop, build, and deploy independently.

## Team and package map

```
┌─────────────────────────────────────────────────────────────────┐
│                   Asset Management Platform                      │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   platform-shell    (Platform Core team)  :5173  HOST    │   │
│  │                                                          │   │
│  │   • Routing / navigation                                 │   │
│  │   • Auth context (mock)                                  │   │
│  │   • Dashboard  ── composes widgets from both MFEs        │   │
│  │   • /billing  ─── lazy-loads remote BillingPage          │   │
│  │   • /accounts ─── lazy-loads remote OpenAccountPage      │   │
│  └──────────────────────────────────────────────────────────┘   │
│              │                                │                  │
│              │ Module Federation              │                  │
│              ▼                                ▼                  │
│  ┌───────────────────────────┐  ┌───────────────────────────┐   │
│  │ mfe-billing  (Billing)    │  │ mfe-open-account (Accts)  │   │
│  │ :5175         REMOTE      │  │ :5174         REMOTE       │   │
│  │                           │  │                            │   │
│  │ exposes:                  │  │ exposes:                   │   │
│  │  ./BillingPage            │  │  ./OpenAccountPage         │   │
│  │  ./OutstandingBalance…    │  │  ./OnboardingProgress…     │   │
│  └────────────┬──────────────┘  └────────────┬───────────────┘   │
│               │                              │                   │
│               │   HTTP (axios, same origin)  │                   │
│               ▼                              ▼                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │   api     :3000   (shared service, domain-split)          │   │
│  │                                                          │   │
│  │   /api/billing/*    →  billing.router + repository        │   │
│  │   /api/accounts/*   →  accounts.router + repository       │   │
│  │   Swagger UI /api-docs  (both domains)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Module Federation contracts

Each remote declares what it exposes in its `vite.config.ts`. The host pulls them by name at runtime.

| Remote             | Exposed module                 | Consumer in shell                  |
| ------------------ | ------------------------------ | ---------------------------------- |
| `mfe_billing`      | `./BillingPage`                | `/billing/*` route                 |
| `mfe_billing`      | `./OutstandingBalanceWidget`   | Dashboard tile                     |
| `mfe_open_account` | `./OpenAccountPage`            | `/accounts/*` route                |
| `mfe_open_account` | `./OnboardingProgressWidget`   | Dashboard tile                     |

The shell declares TypeScript ambient modules for these in `platform-shell/src/vite-env.d.ts` so imports are typed.

**Contract = the exposed name + its default-export component signature.** Nothing else crosses the boundary. No shared code, no shared types at build time. Types for the API are regenerated independently in each MFE from the same Swagger file.

## Shared singletons

Declared in each package's federation config:

```ts
shared: ["react", "react-dom", "@tanstack/react-query"]
```

Consequences:

- Only one React instance across shell + remotes (required — otherwise hooks break).
- One `QueryClient` created by the shell serves both MFEs. An invalidation triggered in `mfe-billing` (after paying an invoice) refreshes the `OutstandingBalanceWidget` immediately — same cache, no wiring.

## Independent development

Each MFE runs in three modes:

1. **Standalone dev** (`npm run dev:billing:standalone`) — full Vite dev server with HMR, own `QueryClient`, own `BrowserRouter`, shows widget preview + page. Useful for team-local work without the shell.
2. **Built preview** (`npm run dev:billing`) — `vite preview` of the built output. Serves `remoteEntry.js` so the shell can consume it.
3. **Consumed by shell** — rendered inside shell's layout with shell's providers (auth, query client, router).

## CSS

Both MFEs use CSS Modules + [`vite-plugin-css-injected-by-js`](https://github.com/Menci/vite-plugin-css-injected-by-js). The plugin inlines CSS into the federated JS bundle — without this, the shell would load `remoteEntry.js` but never request the remote's stylesheet. Each MFE also scopes its top-level container with `isolation: isolate` and a theme-color CSS variables scope so its look is predictable whether standalone or composed.

## API design

`packages/api` is a single Express process, split by domain:

- `src/domains/billing/` — `billing.router.ts` + `billing.schemas.ts` (Zod) + `billing.repository.ts` (in-memory).
- `src/domains/accounts/` — parallel structure.

Nothing is shared between domains beyond the HTTP server itself — each domain is a candidate for extraction into its own BFF later. Swagger document (`src/swagger.ts`) covers both domains with team-tagged operations.

## Type generation

One source of truth (Swagger) → two independent generated clients:

```
api/src/swagger.ts
        │
        ▼  tsx generateSwagger.ts
api/swagger.json
        │
        ├─→ mfe-billing/src/api/generated/         (via swagger-typescript-api)
        └─→ mfe-open-account/src/api/generated/
```

Each MFE imports only the contract types it needs and uses plain axios for calls (see `src/api/index.ts`). The shell does not fetch API data itself — all data-fetching is owned by the team whose MFE renders the data.

## What's deliberately not included

- **No shared-ui package.** Design tokens are duplicated in each package's CSS. In production, a `@amp/design-tokens` workspace with CSS variables would be the first extraction.
- **No event bus / cross-MFE messaging.** All cross-MFE effects go through the shared `QueryClient` (cache invalidation) or the backend. If teams need imperative comms, a custom-events bus at the shell level is the next step.
- **No dynamic import-maps / runtime remote URL discovery.** Remote URLs are hard-coded in `platform-shell/vite.config.ts`. Production would inject these at build time or load a manifest.
- **No auth provider.** `AuthContext` is a stub that returns a fixed user — swap with real IdP integration.
- **No persistence.** Repositories are in-memory arrays; data resets on API restart.

## Tech stack

- React 19, Vite 6, TypeScript 5, React Router 7, TanStack Query 5
- `@originjs/vite-plugin-federation` for Module Federation
- `vite-plugin-css-injected-by-js` for remote CSS
- Express 4, Zod, Swagger/OpenAPI 3
- `swagger-typescript-api` for client generation
- Jest + ts-jest for API tests
