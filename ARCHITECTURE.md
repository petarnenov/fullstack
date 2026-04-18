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
│  │   • /accounts  ── OpenAccountPage + injects Billing widget   │   │
│  │                    into its billingSlot (slot composition)   │   │
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
│          │   HTTP (axios, same-origin, httpOnly    │                │
│          │    cookies + X-CSRF-Token header)       │                │
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

| Remote             | Exposed module                 | Component signature             | Consumer in shell                             |
| ------------------ | ------------------------------ | ------------------------------- | --------------------------------------------- |
| `mfe_billing`      | `./BillingPage`                | `() => JSX`                     | `/billing/*` route                            |
| `mfe_billing`      | `./OutstandingBalanceWidget`   | `() => JSX`                     | Dashboard tile + Open Account slot            |
| `mfe_open_account` | `./OpenAccountPage`            | `({ billingSlot? }) => JSX`     | `/accounts/*` route                           |
| `mfe_open_account` | `./OnboardingProgressWidget`   | `() => JSX`                     | Dashboard tile                                |
| `mfe_trading`      | `./TradingPage`                | `() => JSX`                     | `/trading/*` route                            |
| `mfe_trading`      | `./PortfolioWidget`            | `() => JSX`                     | Dashboard tile                                |

The shell declares TypeScript ambient modules for these in `platform-shell/src/vite-env.d.ts` so imports are typed.

**Contract = the exposed name + its component signature (props included).** Nothing else crosses the boundary. No shared code, no shared types at build time. Types for the API are regenerated independently in each MFE from the same Swagger file.

## Composition patterns

Two distinct patterns live in this POC. Both are driven by the shell; no MFE ever imports another MFE.

### 1. Orchestration (Dashboard)

The shell owns a surface and assembles it from widgets of several teams. Shell knows every team's widget; the teams don't know about each other.

```tsx
// platform-shell/src/pages/DashboardPage.tsx
const OutstandingBalanceWidget = lazy(() => import("mfe_billing/OutstandingBalanceWidget"));
const OnboardingProgressWidget = lazy(() => import("mfe_open_account/OnboardingProgressWidget"));
const PortfolioWidget          = lazy(() => import("mfe_trading/PortfolioWidget"));
```

### 2. Slot composition (Open Account page)

A remote's page reserves a **typed slot** (a `ReactNode` prop) and stays agnostic about what goes in it. The shell fills the slot with a widget from another team. The hosting remote still has zero imports from the other remote.

```tsx
// mfe-open-account/src/pages/OpenAccountPage.tsx  — Open Account team
interface OpenAccountPageProps { billingSlot?: ReactNode; }
export default function OpenAccountPage({ billingSlot }: OpenAccountPageProps = {}) {
  return (
    <div>
      …
      {billingSlot && <aside>{billingSlot}</aside>}
      …
    </div>
  );
}

// platform-shell/src/App.tsx  — Platform Core team composes
<OpenAccountPage
  billingSlot={
    <MfeBoundary label="Outstanding balance widget" fallbackHeight={140}>
      <OutstandingBalanceWidget />
    </MfeBoundary>
  }
/>
```

The ambient declaration in `platform-shell/src/vite-env.d.ts` carries the prop shape so the composition is type-checked in the shell.

**Why this matters:** teams can evolve independently (Platform Core swaps the slot's contents without Open Account changing), yet cross-team widgets appear inside team-owned surfaces. No shared-UI package is needed. The shared `QueryClient` still drives invalidation — a `billingKeys.summary()` invalidation in Billing refreshes the widget wherever it happens to be mounted, including inside Open Account.

## Authentication

Auth is a Platform Core concern — the shell owns it end-to-end. Neither MFE knows how login works; they only know how to echo a CSRF token on state-changing requests and let the browser carry the session cookie.

```
┌─────────────────────────────────────────────────────────────┐
│ platform-shell                                              │
│                                                             │
│   AuthContext ─┬──► /api/auth/login  (email + password)     │
│                ├──► /api/auth/me     (bootstrap on reload)  │
│                ├──► /api/auth/refresh (silent, on 401)      │
│                └──► /api/auth/logout (revoke + clear)       │
│                                                             │
│   installs window.__AMP_PLATFORM__ =                        │
│     { user, csrfToken, logout }                             │
│   listens for window "amp:auth-expired" event               │
│                                                             │
│   ProtectedRoute gates /, /billing, /accounts, /settings,   │
│   /trading  → anonymous → <Navigate to="/login"/>           │
└──────────────────┬──────────────────────────────────────────┘
                   │ runtime contract (window bag)
                   │ + browser-managed cookies:
                   │   amp_access_token   (httpOnly, 15m)
                   │   amp_refresh_token  (httpOnly, 7d)
                   │   amp_csrf_token     (JS-readable, SameSite=Strict)
┌──────────────────┴──────────────────────────────────────────┐
│ mfe-billing / mfe-open-account / mfe-trading (each)         │
│                                                             │
│   axios: withCredentials: true                              │
│                                                             │
│   axios request interceptor:                                │
│     if non-safe method:                                     │
│       X-CSRF-Token: window.__AMP_PLATFORM__?.csrfToken      │
│                                                             │
│   axios response interceptor:                               │
│     on 401 → dispatchEvent("amp:auth-expired")              │
│              (shell attempts silent refresh, else logout)   │
└─────────────────────────────────────────────────────────────┘
```

**Contract surface between teams = one object shape + one event name.** Each MFE duplicates the `PlatformSdk` interface inline (see the comment in its `src/api/index.ts`) so there is zero build-time coupling between teams. When the shell wants to change the contract, it's a versioning conversation, not a coordinated rebuild.

**Why not federation-expose an SDK or use an import-map module?** Both are valid upgrades for production:

- Federation-exposed: shell declares `exposes: { "./auth": "./src/auth/platformSdk" }` and MFEs import `platform_shell/auth`. Type-safe, but inverts the usual remote→host direction and makes the MFEs' federation configs aware of the shell's existence.
- Import map / SystemJS: each team imports `@amp/platform-sdk` and the browser resolves the URL at runtime. Cleanest, but requires an import-map loader.

For a 30-minute talk the window bag is the minimum that teaches the right mental model (contract-first, zero build coupling). For production I'd pick federation-exposed.

**Backend.** `api/src/domains/auth/` hashes demo passwords with argon2id at seed time and issues opaque access + refresh tokens from an in-memory session store. `api/src/shared/authMiddleware.ts` exports `requireAuth` (reads the `amp_access_token` cookie) and `requireCsrf` (double-submit: header `X-CSRF-Token` must equal the `amp_csrf_token` cookie on non-GET methods). Both middlewares are applied to `/api/billing/*`, `/api/accounts/*`, and `/api/trading/*`. `/api/auth/login` is rate-limited (10/min), `/api/auth/refresh` is rate-limited (30/min) and rotates the refresh token with reuse detection — replaying a rotated refresh token kills the whole session family. Demo users are hardcoded; `GET /api/auth/demo-credentials` is gated behind `NODE_ENV !== "production"`.

**Session persistence.** The browser carries the session. On boot, the shell calls `/api/auth/me`; if the access cookie is valid it returns the user. If the access cookie has expired but the refresh cookie is still alive, the shell attempts a silent `POST /api/auth/refresh` (which rotates all three cookies) before falling back to anonymous. On successful login or refresh, the shell invalidates the entire React Query cache — every widget refetches under the new identity without extra wiring, thanks to the shared `QueryClient` singleton.

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
- `src/domains/trading/` — symbols, positions, orders, **per-account cash ledger**, portfolio summary. Market orders fill instantly at the seeded last price; positions + cash are keyed by `accountId` (Trading's own in-memory map, auto-inits unseen accounts to $1,000,000). Buys debit cash, sells credit cash; over-spends and over-sells both return `rejected` orders with 409.

**Cross-domain convention.** `accountId` is the shared join key used by Billing (invoices reference an account), Accounts (owns the account identity + KYC), and Trading (owns the cash ledger and positions for that account). No team imports another's repository — each owns its slice of the account's data and exposes it through its own API.

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
- **No external IdP.** The local auth stack is production-grade in shape — argon2id password hashing, httpOnly session cookies, refresh-token rotation with reuse detection, CSRF double-submit, and rate-limited `/login` + `/refresh`. It is still in-memory and self-hosted. Production swaps the `authRepository` for an OIDC / IdP integration (Keycloak, Auth0, Cognito, Azure AD) so SSO, MFA, B2B federation, and user lifecycle are all handled outside the app.
- **No persistence.** Repositories are in-memory arrays; data resets on API restart.

## Tech stack

- React 19, Vite 6, TypeScript 5, React Router 7, TanStack Query 5
- `@originjs/vite-plugin-federation` for Module Federation
- `vite-plugin-css-injected-by-js` for remote CSS
- Express 4, Zod, Swagger/OpenAPI 3
- `swagger-typescript-api` for client generation
- Jest + ts-jest for API tests
