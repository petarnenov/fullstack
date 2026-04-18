# Micro Frontends — A 30-Minute Walkthrough

**Case study:** the Asset Management Platform POC in this repo.
**Format:** slide-style notes, one moment per `##`. Speaker notes in blockquotes.
**Audience:** frontend engineers evaluating the pattern.
**Budget:** 30 min + 5 min Q&A. Aim ~90s per slide.

---

## 0 · Title & framing (2 min)

### Micro Frontends in practice: what we chose, what we skipped

> "I'm going to walk you through a real micro-frontend architecture — but not the theoretical kind. We built a 4-team asset-management platform over the last week and I'll show you every load-bearing decision we made and what it cost."

Open the repo side by side:

- `README.md` — scope at a glance
- `ARCHITECTURE.md` — full design
- Running app on http://localhost:5173

---

## 1 · The problem we're solving (2 min)

### A single SPA stops scaling at team-3

- One team, one codebase, one CI, one on-call rotation — fine.
- Three teams shipping into the same SPA — merges get painful, releases get coupled, a Billing bug blocks an Open Account release.
- Micro frontends trade build-time coordination for runtime composition.

> "The real motivation isn't technical; it's organisational. If you don't have 3+ teams on one product, you don't need this."

---

## 2 · What a micro frontend is (and isn't) (2 min)

| It IS                                                 | It ISN'T                                   |
| ----------------------------------------------------- | ------------------------------------------ |
| A runtime composition model                           | A way to avoid npm dependencies            |
| An ownership boundary (team → package)                | A performance optimisation                 |
| Independent build + deploy per slice                  | A rewrite excuse                           |
| A team autonomy enabler                               | Free — you pay in coordination             |

> "Iframes, web components, Module Federation, import-maps — those are mechanisms. The pattern is team autonomy with a shared surface."

---

## 3 · Our team & package map (2 min)

```
     Platform Core (shell)
     /       |        \    \
    /        |         \    \
 Billing  Open Acct   Trading   (+ shared API)
```

| Team          | Package                 | Port | Owns                                        |
| ------------- | ----------------------- | ---- | ------------------------------------------- |
| Platform Core | `@amp/platform-shell`   | 5173 | Shell, nav, auth, theme, Dashboard          |
| Billing       | `@amp/mfe-billing`      | 5175 | Invoices, transactions, balance widget      |
| Open Account  | `@amp/mfe-open-account` | 5174 | Onboarding wizard, progress widget          |
| Trading       | `@amp/mfe-trading`      | 5176 | Orders, positions, cash, portfolio widget   |
| (service)     | `@amp/api`              | 3000 | Domain-split Express API (4 domains)        |

**Naming convention:** `mfe-<domain>` + shell + api. The package name encodes the team boundary.

---

## 4 · The mechanism: Module Federation (2 min)

Each remote declares what it exposes:

```ts
// mfe-trading/vite.config.ts
federation({
  name: "mfe_trading",
  filename: "remoteEntry.js",
  exposes: {
    "./TradingPage": "./src/pages/TradingPage",
    "./PortfolioWidget": "./src/widgets/PortfolioWidget",
  },
  shared: ["react", "react-dom", "@tanstack/react-query"],
}),
```

Shell consumes them at runtime:

```ts
// platform-shell/vite.config.ts
federation({
  name: "platform_shell",
  remotes: {
    mfe_billing:      "http://localhost:5175/assets/remoteEntry.js",
    mfe_open_account: "http://localhost:5174/assets/remoteEntry.js",
    mfe_trading:      "http://localhost:5176/assets/remoteEntry.js",
  },
  shared: ["react", "react-dom", "@tanstack/react-query"],
}),
```

```ts
// platform-shell/src/pages/DashboardPage.tsx
const PortfolioWidget = lazy(() => import("mfe_trading/PortfolioWidget"));
```

**That's the entire integration.** Three remotes, three exposed modules each, zero shared source code.

---

## 5 · The contract between teams (2 min)

> "What crosses the team boundary?"

Only:

1. **The exposed module name** + its default-export component signature.
2. **Shared singletons** declared in federation's `shared:` list.
3. **Runtime contracts we build on top** (auth SDK, CSS tokens) — explicit, minimal.

That's it. No shared npm package. No shared type imports at build time. No internal helpers.

Every MFE regenerates its own API client from the same Swagger — duplicated contracts, zero build coupling.

> "When Billing rebuilds, nobody else rebuilds. When Billing deploys, nobody else deploys. Can you say that about your current monolith?"

---

## 6 · Shared singletons (1.5 min)

```ts
shared: ["react", "react-dom", "@tanstack/react-query"]
```

### Why each one matters:

- **React / React DOM**: two instances break hooks. Non-negotiable.
- **@tanstack/react-query**: one `QueryClient` across all MFEs + shell. **This is our cross-MFE messaging layer.**

Real example: paying an invoice in `mfe-billing` invalidates `billingKeys.all`. The `OutstandingBalanceWidget` on the Dashboard — in the shell, but owned by Billing — refetches immediately. No event bus, no prop drilling.

> "Shared cache is the cheapest event bus you will ever own."

---

## 7 · Live moment: Dashboard composition (1.5 min)

Open http://localhost:5173 → Dashboard.

- 4 tiles, 4 team badges.
- Source: `DashboardPage.tsx`, 3 `lazy(() => import("mfe_*/Widget"))` lines.
- Each widget fetches its own data, reads the same token, writes into the same cache.
- **Pay an invoice → outstanding balance drops. No wiring.**

> "This is the visual payoff. Everything on screen is composed; the shell is ~400 lines."

---

## 7a · Second pattern: slot composition (1.5 min)

Dashboard = shell composes a *new* surface. Now the inverse: a team's own page reserves a slot for someone else's widget.

```tsx
// mfe-open-account/src/pages/OpenAccountPage.tsx  (Open Account team)
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
```

```tsx
// platform-shell/src/App.tsx  (Platform Core composes)
<OpenAccountPage
  billingSlot={
    <MfeBoundary label="Outstanding balance widget">
      <OutstandingBalanceWidget />
    </MfeBoundary>
  }
/>
```

- Open Account package has **zero** imports from `mfe_billing`.
- The contract is still "name + component signature" — the signature just includes a `ReactNode` prop.
- Same shared `QueryClient`: pay an invoice on `/billing`, the widget inside `/accounts` updates instantly.
- Nested `MfeBoundary` around the slot means a Billing outage shows a widget-sized error; the onboarding pipeline keeps running.

> "Two patterns, same primitives. The shell is the only place allowed to know about two teams at once."

---

## 8 · Auth — where teams really couple (2.5 min)

Auth is the first place the MFE pattern leaks. Options:

1. **Each MFE does its own login** → UX nightmare.
2. **Shared auth package** → reintroduces build coupling.
3. **Shell owns auth, publishes a runtime SDK to remotes** ← we picked this.

```ts
// platform-shell/src/auth/platformSdk.ts
export interface PlatformSdk {
  getToken(): string | null;
}
window.__AMP_PLATFORM__ = { getToken: () => currentToken };
```

```ts
// mfe-trading/src/api/index.ts — runs inside each MFE's axios
http.interceptors.request.use((config) => {
  const sdk = window.__AMP_PLATFORM__;
  const token = sdk?.getToken?.() ?? null;
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});
```

On 401, the MFE fires `amp:auth-expired` on window; the shell hears it and forces logout.

**Cross-team contract = one interface shape + one event name.** Duplicated inline in each MFE. Zero build coupling.

> "In production you'd formalise this as a federation-exposed SDK or an import map. The window bag is minimum-viable, and it teaches the right mental model: contract first, mechanism second."

---

## 9 · Theme — CSS tokens as implicit contract (1.5 min)

Same pattern applied to design:

```css
/* Defined by shell */
[data-theme="dark"] {
  --bg: #0f1117;
  --text: #e8ebf2;
  --border: #2e3240;
  /* ... */
}
```

Each MFE's CSS modules reference `var(--bg)`, `var(--text)` — they don't know who set them. Shell writes `data-theme` on `<html>`; remotes inherit.

Each MFE also defines its own fallback tokens in `index.css` so it works standalone (including `@media (prefers-color-scheme: dark)`).

> "The shell-owned variables are a design-system contract without a design-system package. Same decoupling story."

---

## 10 · Cross-domain data: the `accountId` join key (2 min)

The Trading team's cash ledger, the Billing team's invoices, and the Open Account team's identity records all reference the same `accountId` — but **no team imports another's repository**.

```
api/src/domains/
├── auth/          (Platform Core)
├── billing/       (Billing)  — invoices tagged by accountId
├── accounts/      (Open Account) — owns identity, KYC, product type
└── trading/       (Trading) — owns positions + cash, keyed by accountId
```

When you buy AAPL on `acc_verified_1`:
- Trading debits that account's cash in its own `Map<accountId, number>`.
- Trading doesn't ask Accounts if the account exists (lazy-init to $1M).
- Billing's invoices for that account are unaffected.

> "`accountId` is the shared convention. Each team owns its slice of what 'an account' is. This is exactly how real financial systems are structured: you have a customer ID, every team has its own view."

---

## 11 · Type generation: one Swagger, four clients (1.5 min)

```
api/src/swagger.ts        (source of truth, hand-written)
        │
        ▼  generateSwagger.ts
api/swagger.json
        │
        ├──► platform-shell/src/api/generated/   (auth only)
        ├──► mfe-billing/src/api/generated/
        ├──► mfe-open-account/src/api/generated/
        └──► mfe-trading/src/api/generated/
```

- **Generation happens per package** — not a shared package.
- Trading breaking its endpoint → only Trading fails to typecheck; others untouched.
- Each MFE wraps the generated client in `api/index.ts` + a React Query key factory.

> "Contracts travel via regeneration, not via imports. That's the decoupling discipline."

---

## 12 · CSS isolation in remotes (1 min)

Vite's federation plugin does NOT load CSS files from remotes. Without intervention, widgets mount unstyled.

Solution:

```ts
// each MFE's vite.config.ts
plugins: [
  cssInjectedByJsPlugin(),  // inlines CSS into the JS bundle
  federation({ ... }),
]
```

Plus `isolation: isolate` on each MFE's root container so styles stay scoped.

> "This is a sharp edge. Miss it and your federated pages render with no styles in production. Test composed mode early."

---

## 13 · Three dev modes per MFE (1.5 min)

Each MFE supports:

1. **Standalone with HMR** (`npm run dev:trading:standalone`) → port 5176, vite dev, own `QueryClient`, own Router. Team-local iteration.
2. **Built preview** (`npm run dev:trading`) → `vite preview` serving dist/. Needed because the shell consumes `remoteEntry.js` which only exists after `vite build`.
3. **Consumed by shell** → the shell's `lazy(() => import("mfe_trading/…"))` pulls the remote; MFE uses shell's providers.

> "Standalone mode is how you keep the team unblocked. You never need the other three processes to fix your bug."

---

## 14 · Deploy independence (the blast radius story) (1.5 min)

Kill the `mfe-billing` process → Billing widget on the dashboard shows an error state via `<MfeBoundary>`. Everything else keeps working. Restart → widget comes back.

- **Three different CI pipelines, three different release cadences.**
- Billing's bad deploy doesn't break Trading.
- Each `remoteEntry.js` can live on its own CDN.

> "This is the single biggest organisational win. Smaller blast radius = more deploys = faster teams."

---

## 15 · Shell owns platform concerns (1 min)

What the shell does and only the shell does:

- Routing & navigation
- Auth (login, session, `<ProtectedRoute>`, `/api/auth/*`)
- Theme (`data-theme`, tokens, `<ThemeToggle />`)
- Layout (sidebar, user card, logout)
- Error boundaries around remote loading (`<MfeBoundary>`)
- The platform SDK (`window.__AMP_PLATFORM__`)

What the shell **doesn't** do:

- Fetch Billing, Accounts, or Trading data.
- Know any MFE's internal components.
- Know what a position or invoice is.

---

## 16 · Trade-offs — the honest slide (2 min)

### You gain

- **Team autonomy**: dev, build, deploy, on-call per team.
- **Small blast radius** on failures.
- **Independent tech upgrades** within shared-singleton constraints.
- **Parallel velocity**: 3 teams ship simultaneously.

### You pay

- **One React** across remotes — version upgrades need coordination.
- **CSS isolation is manual** (CSS Modules + `isolation: isolate`).
- **Runtime composition** = slower first paint than a monolith SPA.
- **Contract discipline required**: typed exposes help, but humans still need to enforce.
- **The shell is a new thing to own** — someone has to run Platform Core.
- **Debugging crosses 3 repos** when something breaks end-to-end.

> "This pattern is not free. If your answer to 'how many teams ship here' is 1-2, a well-modularised monolith will beat this every time."

---

## 17 · Production upgrades we deliberately skipped (1.5 min)

What's POC-only in this repo and what you'd change for real:

| POC                                         | Production                                                     |
| ------------------------------------------- | -------------------------------------------------------------- |
| Window bag for auth SDK                     | Federation-exposed SDK OR import-map module with typed stubs   |
| Opaque tokens in `localStorage`             | JWT (or opaque) in httpOnly cookies; refresh tokens; OIDC IdP  |
| Hardcoded remote URLs in vite.config        | Build-time injection or runtime manifest + versioned URLs      |
| In-memory repositories                      | Real DBs per domain (or one DB, schema-separated)              |
| No shared design system                     | `@company/tokens` package with CSS variables + component lib   |
| No cross-MFE event bus                      | Shared cache covers ~80%; add typed events for the rest        |

---

## 18 · When NOT to do this (1 min)

Say no to micro frontends if:

- You have fewer than ~3 shipping teams.
- Your product is one cohesive surface that changes as a whole.
- Your team doesn't have the infra maturity for 3 independent CI/CD pipelines.
- You can't commit to version-coordination on React / core libs.
- Your performance budget can't absorb the runtime-composition cost.

A well-structured monolith with clear feature folders is often the right answer.

---

## 19 · Recap + Q&A (1 min)

What we covered:

1. Team → package boundary (`mfe-<domain>` convention)
2. Module Federation: remotes + exposed modules + shared singletons
3. The cross-team contract = exposed name + component signature. Nothing else.
4. Two composition patterns: orchestration (Dashboard) + slot composition (`OpenAccountPage.billingSlot`).
5. Cross-cutting concerns via runtime contracts: auth (window SDK), theme (CSS variables), data (accountId as join key).
6. Type generation per package — decoupled contracts.
7. Three dev modes, three deploy modes.
8. Trade-offs: autonomy vs. coordination cost.

**Repo map for deeper reading:**

- `ARCHITECTURE.md` — all decisions in one place
- `DEMO_SCRIPT.md` — hands-on 30-min walkthrough
- `CLAUDE.md` — load-bearing constraints for anyone editing the repo
- `packages/platform-shell/vite.config.ts` — federation setup
- `packages/*/src/api/index.ts` — axios + auth interceptor (MFE pattern)

> "Questions? Pick any slide and I'll go deeper."

---

## Presenter cheat sheet

| Moment                         | Slide  | File                                                            |
| ------------------------------ | ------ | --------------------------------------------------------------- |
| Team/package diagram           | 3      | `ARCHITECTURE.md` top                                           |
| Shell federation config        | 4      | `packages/platform-shell/vite.config.ts`                        |
| MFE exposes                    | 4      | `packages/mfe-trading/vite.config.ts`                           |
| Lazy import                    | 4, 7   | `packages/platform-shell/src/pages/DashboardPage.tsx`           |
| Slot composition (MFE side)    | 7a     | `packages/mfe-open-account/src/pages/OpenAccountPage.tsx`       |
| Slot composition (shell side)  | 7a     | `packages/platform-shell/src/App.tsx` (`/accounts` route)       |
| Shared-cache invalidation      | 6      | `packages/mfe-billing/src/components/InvoicesTable.tsx`         |
| Auth SDK contract              | 8      | `packages/platform-shell/src/auth/platformSdk.ts`               |
| MFE auth interceptor           | 8      | `packages/mfe-trading/src/api/index.ts`                         |
| Theme tokens                   | 9      | `packages/platform-shell/src/index.css`                         |
| Cross-domain accountId         | 10     | `packages/api/src/domains/trading/trading.repository.ts`        |
| Swagger → 4 clients            | 11     | `packages/api/package.json` → `generate:types:*`                |
| CSS injection plugin           | 12     | `packages/mfe-trading/vite.config.ts`                           |
| MfeBoundary error state        | 14     | `packages/platform-shell/src/components/MfeBoundary.tsx`        |

**Timing pad:** if running short, cut slides 12 (CSS) and 15 (shell owns). If running long, skip 7a (slot composition) — its point is subsumed by 7 if the audience is already convinced — or 13 (dev modes), which overlaps with 14.
