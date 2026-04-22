# 30-Minute Demo Script

Audience: frontend team evaluating micro-frontend technology.
Goal: they should leave understanding what Module Federation buys them, what it costs, and what it looks like in a realistic monorepo.

Total budget: 30 minutes. Cut ruthlessly if running long.

Before a session, clear `amp.auth.token` from localStorage (DevTools → Application → Local Storage) so the first load shows the login page.

## Before you start

```bash
npm install
npm run dev
```

Wait until you see all seven process names in the `concurrently` output (`api-java`, `bff-reporting`, `billing`, `accounts`, `trading`, `reporting`, `shell`). Open:

- http://localhost:5173 — platform shell (main demo surface)
- http://localhost:5174 — `mfe-open-account` standalone
- http://localhost:5175 — `mfe-billing` standalone
- http://localhost:5177 — `mfe-reporting` standalone (empty when BFF isn't reachable)
- http://localhost:8090/swagger-ui.html — the Reporting BFF's auto-generated Swagger UI (handy for section 7)
- `packages/swagger/src/swagger.ts` — the hand-maintained OpenAPI contract for the monolith (there is no runtime Swagger UI — Tomcat serves only `/api/*`)

Have the repo open in the editor. Keep a terminal visible for restart demos.

---

## 0 · Context (2 min)

> "This is an asset-management platform. In a real org, you'd have Billing, Open Account, Trading, Reporting, and a Platform Core team. Each ships at its own cadence, with its own tests, its own on-call. How do we let them share one app without tripping over each other?"

Draw it:

```
              Platform Core (shell)
            /      |       \       \
           /       |        \       \
      Billing  Open Acct  Trading  Reporting
                                    └── its own BFF
```

Key question: **what crosses the team boundary?** Answer we'll demo: a component name and its props, plus (for Reporting) a dedicated backend. Nothing else.

---

## 1 · Monorepo tour (3 min)

Open `packages/`:

```
packages/
├── api-java/            # Monolith: Tomcat WAR (Struts2 + Akka + Hibernate), 4 domains
├── bff-reporting/       # Spring Boot BFF for Reporting team only — its own JVM
├── swagger/             # Hand-maintained OpenAPI contract for the monolith
├── platform-shell/      # Host
├── mfe-billing/         # Remote
├── mfe-open-account/    # Remote
├── mfe-trading/         # Remote
└── mfe-reporting/       # Remote — talks only to bff-reporting, never the monolith
```

Show `package.json` names. Call out the asymmetry: **three MFEs talk to a shared monolith directly; the fourth has its own BFF**. We'll come back to why in section 7.

Point at `ARCHITECTURE.md` — the team-ownership diagram.

Open `packages/api-java/backend/src/main/java/com/amp/web/` — four domain folders (auth, billing, accounts, trading), each with Struts actions. Then open `.../service/<domain>/` for the Akka managers and `.../agent/<domain>/` for the reaction traits and in-memory state. Tell them: "Each domain is a candidate for extraction into its own BFF later — it's already isolated behind its own Akka agent."

---

## 2 · Sign in — auth is a shell concern (3 min)

Open http://localhost:5173 — you land on `/login`.

> "Every non-login route is gated by a `<ProtectedRoute>` in the shell. The MFE bundles don't even load until the shell's auth context says so — that's the blast-radius win of keeping auth in Platform Core."

Click one of the **demo credential** rows to autofill. Sign in.

- The shell calls `POST /api/auth/login`, stores the token in `localStorage`, installs `window.__AMP_PLATFORM__ = { getToken }`, and invalidates the whole React Query cache so widgets fetch under the new identity.
- Every request to `/api/billing/*`, `/api/accounts/*` and `/api/trading/*` now carries `Authorization: Bearer …` because each MFE's axios interceptor reads from that window bag.

Open `packages/platform-shell/src/auth/platformSdk.ts` and read the five-line interface aloud. Then open `packages/mfe-billing/src/api/index.ts` → the request interceptor. **That's the entire cross-team auth contract.** No shared package, no federation-exposed module. Every MFE duplicates the interface inline intentionally.

> "This trade-off is the 2-minute architecture conversation. The window bag is minimum-viable for a demo. Federation-exposed SDK or an import map is the production upgrade — same shape, stronger type seam."

Reload the page. You stay logged in: the shell's bootstrap effect calls `/api/auth/me`, rehydrates the user, and replays the widgets.

---

## 3 · The shell has no idea what it's composing (5 min)

Open http://localhost:5173 — Dashboard.

> "This page looks like a single product. It isn't. Watch."

Show the five tiles on the Dashboard:

- **Outstanding balance** — orange "Billing team" badge.
- **Onboarding progress** — teal "Open Account team" badge.
- **Portfolio** — violet "Trading team" badge.
- **Reporting summary** — sky-blue "Reporting team" badge. *(This one has a secret we come back to in section 7.)*
- **Platform health** — indigo "Platform Core" badge.

Point at the bottom of the page: "How this page is composed" — reads off the ownership explicitly, and notes that Reporting's data is served by a dedicated BFF rather than the monolith.

Open `packages/platform-shell/src/pages/DashboardPage.tsx`. Four lines that matter:

```tsx
const OutstandingBalanceWidget = lazy(() => import("mfe_billing/OutstandingBalanceWidget"));
const OnboardingProgressWidget = lazy(() => import("mfe_open_account/OnboardingProgressWidget"));
const PortfolioWidget          = lazy(() => import("mfe_trading/PortfolioWidget"));
const ReportingSummaryWidget   = lazy(() => import("mfe_reporting/ReportingSummaryWidget"));
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
    mfe_reporting: "http://localhost:5177/assets/remoteEntry.js",
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

## 7 · Reporting — adding a BFF without touching the monolith (4 min)

> "The fourth team we added last. Their MFE works exactly like the others from the shell's point of view — same federation contract, same composition patterns. But their backend is different."

Navigate to **/reports**. Point at the table: four accounts, each with Billing outstanding + Accounts status + Trading equity joined on one row. Compare with the dashboard tile that shows the same aggregate.

Open DevTools → Network → XHR. Refresh `/reports`. Point at:

```
GET /api/reporting/summary   200   (one request)
```

Now open the BFF log in the terminal (look at the `bff-reporting` stripe in `concurrently`). You'll see multiple outbound requests fan out — `GET /api/accounts`, `GET /api/billing/invoices`, then one `/api/trading/portfolio?accountId=…` per account, in parallel.

> "One round-trip from the browser. Six from the BFF. If the MFE talked to the monolith directly, it would be six round-trips from the browser — every position request paying the full browser-to-server RTT instead of localhost. This is the classic BFF trade: move the fan-out server-side where latency is cheap and you can shape the response for the specific UI."

Open `packages/bff-reporting/src/main/java/com/amp/bff/reporting/service/ReportAggregator.java`:

```java
Mono.zip(accounts, invoices)
  .flatMap(tuple -> Flux.fromIterable(tuple.getT1())
    .flatMap(a -> monolith.getPortfolio(a.id(), authHeader)
      .map(p -> buildReport(a, invoicesFor(a), p)))
    .collectList());
```

> "That's the entire aggregation — `Mono.zip` runs the first two calls in parallel, `flatMap` runs the per-account portfolio calls in parallel after that."

**Three things to highlight**, fast:

1. **Proxy wiring.** Open `packages/platform-shell/vite.config.ts`:

   ```ts
   "/api/reporting": { target: "http://localhost:8090" },  // BFF
   "/api":           { target: "http://localhost:8088" },  // monolith
   ```

   Longest-prefix-first match. And in `packages/mfe-reporting/src/api/index.ts`:

   ```ts
   const http = axios.create({ baseURL: "/api/reporting" });
   ```

   > "The MFE *can't* accidentally call the monolith. Its axios instance is locked to `/api/reporting`. The shell proxy is the fence."

2. **Contract ownership.** Open `packages/mfe-reporting/openapi-bff.json` — this is a committed snapshot of the BFF's OpenAPI. Open http://localhost:8090/swagger-ui.html — same contract, served live by springdoc.

   ```bash
   npm run generate:types --workspace=@amp/mfe-reporting
   ```

   > "The BFF owns its own contract. `@amp/swagger` describes the monolith. Two pipelines. Reporting's types come from the BFF; billing/accounts/trading come from `@amp/swagger`. No shared types between the two worlds — each team controls its seam."

3. **Auth flows through, not around.** Open `packages/bff-reporting/src/main/java/com/amp/bff/reporting/client/MonolithClient.java`:

   ```java
   headers.set(HttpHeaders.AUTHORIZATION, authHeader);
   ```

   > "The BFF doesn't validate the token. It forwards whatever the browser sent to the monolith, and lets the monolith decide. If you log out, the monolith 401s, the BFF forwards the 401, the MFE dispatches `amp:auth-expired`, the shell logs you out. Same flow as the other MFEs — one auth authority."

**Payoff.** Show the dashboard widget one more time (`ReportingSummaryWidget`). Then `/reports`. They render the same aggregated data. Why? Because both components use `reportingKeys.summary()` as the React Query key, and React Query is a federation-shared singleton — one BFF call, two surfaces.

> "Adding this team added one MFE, one BFF, and one proxy rule. The monolith learned nothing. The other three teams learned nothing. That's the scaling story."

---

## 8 · Cash flows through Trading (optional, 2 min)

Navigate to **/trading**. Show the account selector strip at the top — four accounts, each seeded at $1,000,000 (primary has less because of seeded positions).

Click **+ Deposit** and add $50,000 to `acc_verified_2`. Cash pill updates.

Switch to a symbol (e.g., MSFT), enter a quantity, click **Buy**. Cash pill drops by the order total. Switch to the order history at the bottom — new filled order tagged with that accountId.

Sell half the position. Cash goes up by the sell proceeds.

Back to Dashboard. **PortfolioWidget's total equity has already updated** — same shared-cache story as section 6, now applied across cash + positions.

Try a massive buy (like 100,000 NVDA on `acc_kyc_1`) — rejected with "Insufficient cash: have $1,000,000, need $94M" (409, shown in order history as a rejected row, cash untouched).

> "Notice the Trading team owns its own cash ledger and per-account positions. Billing and Accounts also key off `accountId`, but nobody imports each other — each team's slice of 'what an account is' lives in its own repository. That's the architectural pattern you use to keep teams decoupled while still talking about the same customer."

---

## 9 · Slot composition — a second pattern (2 min)

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

## 10 · End-to-end workflow across teams (2 min)

> "Let me show you a flow that touches every team."

1. Navigate to **/accounts**. Start a new onboarding (form on the left). Watch it appear in the pipeline.
2. Click **Advance** until status is `verified`.
3. Navigate to Dashboard. Onboarding progress widget reflects the change.
4. Navigate to **/billing**. In a real platform, a new verified account would have a starter invoice — here, the invoices are seeded against existing accounts, but the point holds: **each domain owns its data; the shell just composes**.

---

## 11 · Types & API contract (2 min)

Open `packages/swagger/src/swagger.ts` briefly — point at `tags: ["Billing"]` and `tags: ["Accounts"]`. Mention: the Swagger doc is the contract SoT; the Java tier in `packages/api-java` implements it.

Run:

```bash
npm run generate:types
```

Point at the output: same Swagger, two independent generated client folders. Each team can choose how strictly to consume theirs.

> "The API is the seam. Each MFE generates its own contract from one Swagger document. If Billing breaks its contract, only Billing's generated types fail to typecheck — Open Account's build is untouched."

---

## 12 · Tradeoffs (2 min)

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
- A BFF is another deployable with its own on-call rota. Only introduce one when the MFE genuinely needs cross-domain aggregation or a reshaped DTO; a single-domain MFE is better off talking to the monolith directly.

---

## 13 · Q&A (pad)

Common questions worth preparing:

- **"Why Module Federation vs. iframes?"** Shared React, shared cache, single SPA navigation, no sandbox overhead. Pay in coordination.
- **"Why not Nx / Turborepo with build-time imports?"** Because we want runtime independence; those approaches compose at build time, so a Billing change still forces a shell rebuild.
- **"What about Server Components / Next.js App Router?"** Different story; federation targets SPA / client-heavy apps. Sometimes both apply.
- **"Testing?"** Each MFE tests its own exposed components in isolation. Shell has integration tests that mock the remotes.
- **"Versioning?"** Remote URLs can be versioned (`/v2/remoteEntry.js`); import maps or manifests resolve the current version.
- **"Why a BFF for Reporting and not for Billing/Accounts/Trading?"** The other three serve one domain each; the MFE already gets back something close to what it renders. Reporting wants a cross-domain denormalised view — the aggregation work has to happen somewhere, and the BFF puts it next to the monolith (localhost hop, parallel fan-out) rather than on the browser (internet hop, sequential).
- **"Why Spring Boot for the BFF and Struts+Akka for the monolith?"** Because the stack is an implementation detail the monolith shouldn't dictate. Different team, different code base, different deployment. They only share the HTTP contract.

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
| Swagger contract (SoT)              | `packages/swagger/src/swagger.ts`                |
| Java backend entrypoint             | `packages/api-java/backend/src/main/java/com/amp/web/` |
| Shell federation config             | `packages/platform-shell/vite.config.ts`         |
| Billing `exposes`                   | `packages/mfe-billing/vite.config.ts`            |
| Lazy imports in shell               | `packages/platform-shell/src/pages/DashboardPage.tsx` |
| Shared-cache invalidation           | `packages/mfe-billing/src/components/InvoicesTable.tsx` |
| Widget using same cache key         | `packages/mfe-billing/src/widgets/OutstandingBalanceWidget.tsx` |
| Slot composition (MFE side)         | `packages/mfe-open-account/src/pages/OpenAccountPage.tsx` — `billingSlot` prop |
| Slot composition (shell side)       | `packages/platform-shell/src/App.tsx` — `/accounts` route |
| Reporting page + table              | http://localhost:5173/reports                    |
| Reporting dashboard widget          | `packages/mfe-reporting/src/widgets/ReportingSummaryWidget.tsx` |
| BFF aggregator (Mono.zip fan-out)   | `packages/bff-reporting/src/main/java/com/amp/bff/reporting/service/ReportAggregator.java` |
| BFF → monolith client (Bearer fwd)  | `packages/bff-reporting/src/main/java/com/amp/bff/reporting/client/MonolithClient.java` |
| BFF upstream-status pass-through    | `packages/bff-reporting/src/main/java/com/amp/bff/reporting/api/WebClientErrorAdvice.java` |
| BFF OpenAPI snapshot (committed)    | `packages/mfe-reporting/openapi-bff.json`        |
| Split proxy (longest-prefix match)  | `packages/platform-shell/vite.config.ts`         |
| BFF Swagger UI (live)               | http://localhost:8090/swagger-ui.html            |
