# 30-Minute Demo Script

Audience: frontend team evaluating micro-frontend technology.
Goal: they should leave understanding what Module Federation buys them, what it costs, and what it looks like in a realistic monorepo.

Total budget: 30 minutes. Cut ruthlessly if running long.

Before a session, clear the session cookies for `localhost:5173` (DevTools → Application → Cookies → delete `amp_access_token`, `amp_refresh_token`, `amp_csrf_token`) so the first load shows the login page.

## Before you start

```bash
npm install
npm run dev
```

Wait until you see all four green process names in the `concurrently` output. Open:

- http://localhost:5173 — platform shell (main demo surface)
- http://localhost:5174 — `mfe-open-account` standalone
- http://localhost:5175 — `mfe-billing` standalone
- http://localhost:3000/api-docs — Swagger UI

Have the repo open in the editor. Keep a terminal visible for restart demos.

---

## 0 · Context (2 min)

> "This is an asset-management platform. In a real org, you'd have Billing, Open Account, Trading, and a Platform Core team. Each ships at its own cadence, with its own tests, its own on-call. How do we let them share one app without tripping over each other?"

Draw it:

```
          Platform Core (shell)
          /       |         \
         /        |          \
    Billing  Open Account  Trading
```

Key question: **what crosses the team boundary?** Answer we'll demo: a component name and its props. Nothing else.

---

## 1 · Monorepo tour (3 min)

Open `packages/`:

```
packages/
├── api/                 # Express, domain-split (4 domains)
├── platform-shell/      # Host
├── mfe-billing/         # Remote
├── mfe-open-account/    # Remote
└── mfe-trading/         # Remote
```

Show `package.json` names: `@amp/api`, `@amp/platform-shell`, `@amp/mfe-billing`, `@amp/mfe-open-account`, `@amp/mfe-trading`.

Point at `ARCHITECTURE.md` — the team-ownership diagram.

Open `packages/api/src/domains/` — four domain folders (auth, billing, accounts, trading), each with router + repo + schema. Tell them: "If we ever need a per-team BFF, this is already half-done."

---

## 2 · Sign in — auth is a shell concern (3 min)

Open http://localhost:5173 — you land on `/login`.

> "Every non-login route is gated by a `<ProtectedRoute>` in the shell. The MFE bundles don't even load until the shell's auth context says so — that's the blast-radius win of keeping auth in Platform Core."

Click one of the **demo credential** rows to autofill. Sign in.

- The shell calls `POST /api/auth/login`. The API sets three cookies: `amp_access_token` (httpOnly, 15-min TTL), `amp_refresh_token` (httpOnly, SameSite=Strict, 7-day TTL), and `amp_csrf_token` (readable by JS, SameSite=Strict). The response body returns `{ user, csrfToken }`.
- The shell installs `window.__AMP_PLATFORM__ = { user, csrfToken, logout }` and invalidates the whole React Query cache so widgets fetch under the new identity.
- Every request to `/api/billing/*`, `/api/accounts/*` and `/api/trading/*` is same-origin via the vite proxy, so the browser attaches the access cookie automatically. MFE axios clients set `withCredentials: true` and, on state-changing methods only, echo `csrfToken` as the `X-CSRF-Token` header (double-submit cookie pattern).

Open DevTools → Application → Cookies and point at the three cookies. Note that `amp_access_token` shows `HttpOnly ✓` — invisible to JS, immune to XSS-driven token theft. Only `amp_csrf_token` is JS-readable, and it's useless on its own without the httpOnly access cookie the browser pairs it with.

Open `packages/platform-shell/src/auth/platformSdk.ts` and read the interface aloud. Then open `packages/mfe-billing/src/api/index.ts` → the request interceptor. **That's the entire cross-team auth contract.** No shared package, no federation-exposed module. Every MFE duplicates the interface inline intentionally.

> "The MFE never sees a token. It reads `csrfToken` off the window and lets the browser handle the credential. Federation-exposed SDK or an import map is the next iteration — same shape, stronger type seam."

Reload the page. You stay logged in: the shell's bootstrap effect calls `/api/auth/me` using the access cookie, rehydrates the user, and replays the widgets. If the access cookie has expired but the refresh cookie is still valid, the shell does a silent `POST /api/auth/refresh` (rotating all three tokens) before declaring the user anonymous.

---

## 3 · The shell has no idea what it's composing (5 min)

Open http://localhost:5173 — Dashboard.

> "This page looks like a single product. It isn't. Watch."

Show the four tiles on the Dashboard:

- **Outstanding balance** — orange "Billing team" badge.
- **Onboarding progress** — teal "Open Account team" badge.
- **Portfolio** — violet "Trading team" badge.
- **Platform health** — indigo "Platform Core" badge.

Point at the bottom of the page: "How this page is composed" — reads off the ownership explicitly.

Open `packages/platform-shell/src/pages/DashboardPage.tsx`. Three lines that matter:

```tsx
const OutstandingBalanceWidget = lazy(() => import("mfe_billing/OutstandingBalanceWidget"));
const OnboardingProgressWidget = lazy(() => import("mfe_open_account/OnboardingProgressWidget"));
const PortfolioWidget         = lazy(() => import("mfe_trading/PortfolioWidget"));
```

> "That's it. That's the integration. The shell has no source code for these widgets. It knows a name and a shape."

Open `packages/platform-shell/vite.config.ts` and show:

```ts
federation({
  name: "platform_shell",
  remotes: {
    mfe_billing: "http://localhost:5175/assets/remoteEntry.js",
    mfe_open_account: "http://localhost:5174/assets/remoteEntry.js",
    mfe_trading: "http://localhost:5176/assets/remoteEntry.js",
  },
  shared: ["react", "react-dom", "@tanstack/react-query"],
}),
```

Walk through:

- `remotes` — where to fetch each team's bundle at runtime.
- `shared` — one React, one React DOM, one QueryClient across all four apps.

Open `packages/mfe-billing/vite.config.ts` and show the matching `exposes` block. **That's the contract.**

---

## 4 · Run a team's MFE standalone (3 min)

> "A Billing engineer is fixing a bug in the invoices table. Do they need the shell running? No."

Switch to http://localhost:5175 — `mfe-billing` standalone. Show the widget preview at the top, full page below. Same components, loaded directly, own QueryClient, own router.

Open `packages/mfe-billing/src/App.tsx` — it's just a local wrapper that imports the same exposed components the shell gets.

Key line: **the team has 100% of their dev loop without touching the other teams.**

Jump to http://localhost:5174 — open-account standalone. Same story.

---

## 5 · Independent deployment, visualised (4 min)

Back to http://localhost:5173.

Open a DevTools → Network → XHR.

- Refresh. Point at the three requests: shell HTML, `mfe_billing/remoteEntry.js`, `mfe_open_account/remoteEntry.js`. Each loaded from its own origin.

> "In production, these three URLs can live on three different CDNs, built by three different CI pipelines, on three different release schedules."

Kill the `mfe-billing` process in the terminal. Navigate to Dashboard again (or refresh).

- Point at the Billing widget slot: it shows an `MfeBoundary` error state. Everything else keeps working.

> "The blast radius of a Billing deploy gone wrong is the Billing widget and the /billing page. The shell survives. Open Account survives."

Restart `mfe-billing`: `npm run dev:billing` in a new terminal (or `Ctrl+C` / restart in the original one). Refresh — the widget comes back.

---

## 6 · Shared cache in action (3 min)

Navigate to **/billing** in the shell. Point at the "Outstanding balance" stat bar. Note the value.

Go to Dashboard. Note the Outstanding balance widget value — same.

Back to **/billing**. Click **Pay** on any pending or overdue invoice.

Go to Dashboard. **The widget has already updated.**

> "No event bus, no prop drilling, no context. The widget and the page both use `@tanstack/react-query` with the same cache key. When one invalidates, the other refetches. Works because React Query is a federation-shared singleton."

Optional: open `packages/mfe-billing/src/components/InvoicesTable.tsx` and show:

```ts
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: billingKeys.all });
}
```

Then `packages/mfe-billing/src/widgets/OutstandingBalanceWidget.tsx`:

```ts
useQuery({ queryKey: billingKeys.summary(), queryFn: billingApi.summary })
```

Same key family. Different component. Different module. Different team.

---

## 7 · Cash flows through Trading (optional, 2 min)

Navigate to **/trading**. Show the account selector strip at the top — four accounts, each seeded at $1,000,000 (primary has less because of seeded positions).

Click **+ Deposit** and add $50,000 to `acc_verified_2`. Cash pill updates.

Switch to a symbol (e.g., MSFT), enter a quantity, click **Buy**. Cash pill drops by the order total. Switch to the order history at the bottom — new filled order tagged with that accountId.

Sell half the position. Cash goes up by the sell proceeds.

Back to Dashboard. **PortfolioWidget's total equity has already updated** — same shared-cache story as section 6, now applied across cash + positions.

Try a massive buy (like 100,000 NVDA on `acc_kyc_1`) — rejected with "Insufficient cash: have $1,000,000, need $94M" (409, shown in order history as a rejected row, cash untouched).

> "Notice the Trading team owns its own cash ledger and per-account positions. Billing and Accounts also key off `accountId`, but nobody imports each other — each team's slice of 'what an account is' lives in its own repository. That's the architectural pattern you use to keep teams decoupled while still talking about the same customer."

---

## 8 · Slot composition — a second pattern (2 min)

> "The dashboard was the shell assembling a new surface. Here's the reverse: a team's own page reserves a slot for another team's widget."

Navigate to **/accounts**. Point at the "Firm billing health" panel in the top right — it renders the same `OutstandingBalanceWidget` shown on the Dashboard and on `/billing`.

Open `packages/mfe-open-account/src/pages/OpenAccountPage.tsx`:

```tsx
interface OpenAccountPageProps {
  billingSlot?: ReactNode;
}
export default function OpenAccountPage({ billingSlot }: OpenAccountPageProps = {}) {
  return (
    <div>
      …
      {billingSlot && <aside>{billingSlot}</aside>}
      …
    </div>
  );
}
```

> "Open Account's page doesn't know what a billing widget is. It reserves a `ReactNode` slot. That's the entire footprint of Billing in this file. Grep the package — zero imports from `mfe_billing`."

Open `packages/platform-shell/src/App.tsx` and show the `/accounts` route:

```tsx
<OpenAccountPage
  billingSlot={
    <MfeBoundary label="Outstanding balance widget" fallbackHeight={140}>
      <OutstandingBalanceWidget />
    </MfeBoundary>
  }
/>
```

> "Platform Core is the only place that knows about both teams. The inner `MfeBoundary` means a Billing outage shows a widget-sized error; Open Account's onboarding pipeline keeps working."

Tie it back to the shared cache: navigate to **/billing**, pay an invoice, return to **/accounts** — the figure inside the slot has already updated. Same `QueryClient` singleton, same `billingKeys.summary()` key.

**Two composition patterns from the same primitives:**

| Pattern             | Who owns the surface         | Example in this repo                   |
| ------------------- | ---------------------------- | -------------------------------------- |
| Orchestration       | Shell composes from widgets  | Dashboard (`DashboardPage.tsx`)        |
| Slot composition    | MFE exposes `ReactNode` prop | `OpenAccountPage.billingSlot`          |

---

## 9 · End-to-end workflow across teams (2 min)

> "Let me show you a flow that touches every team."

1. Navigate to **/accounts**. Start a new onboarding (form on the left). Watch it appear in the pipeline.
2. Click **Advance** until status is `verified`.
3. Navigate to Dashboard. Onboarding progress widget reflects the change.
4. Navigate to **/billing**. In a real platform, a new verified account would have a starter invoice — here, the invoices are seeded against existing accounts, but the point holds: **each domain owns its data; the shell just composes**.

---

## 10 · Types & API contract (2 min)

Open `packages/api/src/swagger.ts` briefly — point at `tags: ["Billing"]` and `tags: ["Accounts"]`.

Run:

```bash
npm run generate:types
```

Point at the output: same Swagger, two independent generated client folders. Each team can choose how strictly to consume theirs.

> "The API is the seam. Each MFE generates its own contract from one Swagger document. If Billing breaks its contract, only Billing's generated types fail to typecheck — Open Account's build is untouched."

---

## 11 · Tradeoffs (2 min)

Be honest. Show this slide or just read it aloud:

**You gain:**
- Team autonomy (dev, build, deploy, on-call).
- Smaller blast radius on failures.
- Independent tech choices per MFE (within the shared-singletons contract).

**You pay:**
- One React across remotes — version upgrades are coordinated.
- CSS isolation is manual (CSS Modules + `isolation: isolate`).
- The shell is a new thing to own; someone has to run Platform Core.
- Runtime composition = slower first paint than a monolith SPA.
- Contract drift between teams needs discipline (typed exposes help).

---

## 12 · Q&A (pad)

Common questions worth preparing:

- **"Why Module Federation vs. iframes?"** Shared React, shared cache, single SPA navigation, no sandbox overhead. Pay in coordination.
- **"Why not Nx / Turborepo with build-time imports?"** Because we want runtime independence; those approaches compose at build time, so a Billing change still forces a shell rebuild.
- **"What about Server Components / Next.js App Router?"** Different story; federation targets SPA / client-heavy apps. Sometimes both apply.
- **"Testing?"** Each MFE tests its own exposed components in isolation. Shell has integration tests that mock the remotes.
- **"Versioning?"** Remote URLs can be versioned (`/v2/remoteEntry.js`); import maps or manifests resolve the current version.

---

## Cheat sheet for the presenter

| Moment                              | URL / file                                       |
| ----------------------------------- | ------------------------------------------------ |
| Login page                          | http://localhost:5173/login                      |
| Auth context + platform SDK         | `packages/platform-shell/src/auth/platformSdk.ts`, `packages/platform-shell/src/auth/AuthContext.tsx` |
| MFE auth interceptor                | `packages/mfe-billing/src/api/index.ts`          |
| Dashboard composition               | http://localhost:5173                            |
| Billing page                        | http://localhost:5173/billing                    |
| Accounts page                       | http://localhost:5173/accounts                   |
| Billing standalone                  | http://localhost:5175                            |
| Accounts standalone                 | http://localhost:5174                            |
| Swagger UI                          | http://localhost:3000/api-docs                   |
| Shell federation config             | `packages/platform-shell/vite.config.ts`         |
| Billing `exposes`                   | `packages/mfe-billing/vite.config.ts`            |
| Lazy imports in shell               | `packages/platform-shell/src/pages/DashboardPage.tsx` |
| Shared-cache invalidation           | `packages/mfe-billing/src/components/InvoicesTable.tsx` |
| Widget using same cache key         | `packages/mfe-billing/src/widgets/OutstandingBalanceWidget.tsx` |
| Slot composition (MFE side)         | `packages/mfe-open-account/src/pages/OpenAccountPage.tsx` — `billingSlot` prop |
| Slot composition (shell side)       | `packages/platform-shell/src/App.tsx` — `/accounts` route |
