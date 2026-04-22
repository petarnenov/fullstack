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
│          │   HTTP (axios, same origin, Bearer)     │                │
│          ▼                   ▼                     ▼                │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │   api-java  :8088  Tomcat WAR, Struts2 + Akka + Hibernate    │   │
│  │                                                              │   │
│  │   /api/auth/*      →  com.amp.web.auth      (Platform Core)  │   │
│  │   /api/billing/*   →  com.amp.web.billing   (Billing, auth)  │   │
│  │   /api/accounts/*  →  com.amp.web.accounts  (Open Account)   │   │
│  │   /api/trading/*   →  com.amp.web.trading   (Trading, auth)  │   │
│  │                                                              │   │
│  │   Swagger doc hand-maintained in packages/swagger/           │   │
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

**Backend.** `com.amp.agent.auth.AuthProcess` issues opaque hex tokens persisted via Hibernate to `user_session_tbl` in an in-memory H2 (not JWT — POC). A shared `AuthenticatedJsonAction` base class guards every billing/accounts/trading action by calling `AuthManager.me(token)` before dispatching to the subclass. Demo users are seeded by Flyway (`db_migrations/MIGRATIONS/V20260422_00001_03__insert_demo_users.sql`) and the login page autofills them via a demo-only `GET /api/auth/demo-credentials` endpoint that would not ship in production.

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

`packages/api-java` is a single Tomcat-deployed WAR, split by domain:

- `com.amp.web.auth` — Struts action per endpoint, `AuthManager` service, `AuthTrait` Akka reactions, `AuthProcess` Hibernate-backed persistence.
- `com.amp.web.billing` — parallel structure (`BillingManager` + `BillingTrait` + `BillingProcess`) with in-memory state seeded in a static block.
- `com.amp.web.accounts` — parallel structure; includes the GET/POST collision on `/api/accounts` resolved by HTTP-method branching inside `ListOrCreateAccountsAction`.
- `com.amp.web.trading` — symbols, positions, orders, **per-account cash ledger**, portfolio summary. Market orders fill instantly at the seeded last price; positions + cash are keyed by `accountId` (`TradingProcess.CASH_LEDGER`, a static `Map<String,Double>` auto-initialised to $1,000,000 for unseen accounts). Buys debit cash, sells credit cash; over-spends and over-sells both return `rejected` orders with 409.

**Cross-domain convention.** `accountId` is the shared join key used by Billing (invoices reference an account), Accounts (owns the account identity + KYC), and Trading (owns the cash ledger and positions for that account). No manager imports another's process — each owns its slice of the account's data and exposes it through its own actions.

Agents are registered once in `atomatron.worker.agentsystem.AgentSystem.createAgents()`; each runs on its own Akka mailbox so the actor model serialises state mutations for free. Struts URL dispatch uses a custom `MultiSegmentActionMapper` (in `com.amp.web.common`) to support REST-style wildcards like `invoices/*/pay` that the default mapper rejects. Swagger document (`packages/swagger/src/swagger.ts`) is the contract SoT — the Java tier must match it.

## Type generation

One source of truth (Swagger) → two independent generated clients:

```
packages/swagger/src/swagger.ts
        │
        ▼  tsx generateSwagger.ts
packages/swagger/swagger.json
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
- **No real IdP.** Auth uses opaque hex tokens + hardcoded demo users seeded by Flyway. Production swaps `AuthProcess` for an OIDC / IdP integration and moves the token to an httpOnly cookie.
- **No persistence for billing/accounts/trading.** `BillingProcess`, `AccountsProcess`, `TradingProcess` hold state in static collections; data resets on every Tomcat restart. Auth persists to an in-memory H2 via Hibernate (Flyway migrations create the schema), so sessions survive across requests but not across restarts.
- **No Node/Express tier.** The branch previously had an `@amp/api` workspace that mirrored the domains in TypeScript + Jest; it was deleted in favour of the Java backend. The Swagger contract moved to `@amp/swagger` (pure data + codegen).

## Tech stack

- React 19, Vite 6, TypeScript 5, React Router 7, TanStack Query 5
- `@originjs/vite-plugin-federation` for Module Federation
- `vite-plugin-css-injected-by-js` for remote CSS
- Java 17, Tomcat 9, Apache Struts 2, Akka 2.6 (Scala 2.13), Hibernate 5.6, H2, Flyway
- Gradle 8 for the WAR build; `swagger-typescript-api` for frontend client generation
- OpenAPI 3.0 contract hand-maintained in `packages/swagger`
