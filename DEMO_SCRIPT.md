# 30-Minute Demo Script

Audience: frontend team evaluating micro-frontend technology.
Goal: they should leave understanding what Module Federation buys them, what it costs, and what it looks like in a realistic monorepo.

Total budget: 30 minutes. Cut ruthlessly if running long.

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

> "This is an asset-management platform. In a real org, you'd have a Billing team, an Open Account team, and a Platform Core team. Each ships at its own cadence, with its own tests, its own on-call. How do we let them share one app without tripping over each other?"

Draw the triangle:

```
        Platform Core (shell)
              /     \
             /       \
       Billing ─── Open Account
```

Key question: **what crosses the team boundary?** Answer we'll demo: a component name and its props. Nothing else.

---

## 1 · Monorepo tour (3 min)

Open `packages/`:

```
packages/
├── api/                 # Express, domain-split
├── platform-shell/      # Host
├── mfe-billing/         # Remote
└── mfe-open-account/    # Remote
```

Show `package.json` names: `@amp/api`, `@amp/platform-shell`, `@amp/mfe-billing`, `@amp/mfe-open-account`.

Point at `ARCHITECTURE.md` — the team-ownership diagram.

Open `packages/api/src/domains/` — two domain folders, each with router + repo + schema. Tell them: "If we ever need a Billing BFF separate from an Accounts BFF, this is already half-done."

---

## 2 · The shell has no idea what it's composing (5 min)

Open http://localhost:5173 — Dashboard.

> "This page looks like a single product. It isn't. Watch."

Show the three tiles on the Dashboard:

- **Outstanding balance** — with the orange "Billing team" badge.
- **Onboarding progress** — with the teal "Open Account team" badge.
- **Platform health** — with the purple "Platform Core" badge.

Point at the bottom of the page: "How this page is composed" — reads off the ownership explicitly.

Open `packages/platform-shell/src/pages/DashboardPage.tsx`. Two lines that matter:

```tsx
const OutstandingBalanceWidget = lazy(() => import("mfe_billing/OutstandingBalanceWidget"));
const OnboardingProgressWidget = lazy(() => import("mfe_open_account/OnboardingProgressWidget"));
```

> "That's it. That's the integration. The shell has no source code for these widgets. It knows a name and a shape."

Open `packages/platform-shell/vite.config.ts` and show:

```ts
federation({
  name: "platform_shell",
  remotes: {
    mfe_billing: "http://localhost:5175/assets/remoteEntry.js",
    mfe_open_account: "http://localhost:5174/assets/remoteEntry.js",
  },
  shared: ["react", "react-dom", "@tanstack/react-query"],
}),
```

Walk through:

- `remotes` — where to fetch each team's bundle at runtime.
- `shared` — one React, one React DOM, one QueryClient across all three apps.

Open `packages/mfe-billing/vite.config.ts` and show the matching `exposes` block. **That's the contract.**

---

## 3 · Run a team's MFE standalone (3 min)

> "A Billing engineer is fixing a bug in the invoices table. Do they need the shell running? No."

Switch to http://localhost:5175 — `mfe-billing` standalone. Show the widget preview at the top, full page below. Same components, loaded directly, own QueryClient, own router.

Open `packages/mfe-billing/src/App.tsx` — it's just a local wrapper that imports the same exposed components the shell gets.

Key line: **the team has 100% of their dev loop without touching the other teams.**

Jump to http://localhost:5174 — open-account standalone. Same story.

---

## 4 · Independent deployment, visualised (4 min)

Back to http://localhost:5173.

Open a DevTools → Network → XHR.

- Refresh. Point at the three requests: shell HTML, `mfe_billing/remoteEntry.js`, `mfe_open_account/remoteEntry.js`. Each loaded from its own origin.

> "In production, these three URLs can live on three different CDNs, built by three different CI pipelines, on three different release schedules."

Kill the `mfe-billing` process in the terminal. Navigate to Dashboard again (or refresh).

- Point at the Billing widget slot: it shows an `MfeBoundary` error state. Everything else keeps working.

> "The blast radius of a Billing deploy gone wrong is the Billing widget and the /billing page. The shell survives. Open Account survives."

Restart `mfe-billing`: `npm run dev:billing` in a new terminal (or `Ctrl+C` / restart in the original one). Refresh — the widget comes back.

---

## 5 · Shared cache in action (4 min)

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

## 6 · End-to-end workflow across teams (4 min)

> "Let me show you a flow that touches both teams."

1. Navigate to **/accounts**. Start a new onboarding (form on the left). Watch it appear in the pipeline.
2. Click **Advance** until status is `verified`.
3. Navigate to Dashboard. Onboarding progress widget reflects the change.
4. Navigate to **/billing**. In a real platform, a new verified account would have a starter invoice — here, the invoices are seeded against existing accounts, but the point holds: **each domain owns its data; the shell just composes**.

---

## 7 · Types & API contract (3 min)

Open `packages/api/src/swagger.ts` briefly — point at `tags: ["Billing"]` and `tags: ["Accounts"]`.

Run:

```bash
npm run generate:types
```

Point at the output: same Swagger, two independent generated client folders. Each team can choose how strictly to consume theirs.

> "The API is the seam. Each MFE generates its own contract from one Swagger document. If Billing breaks its contract, only Billing's generated types fail to typecheck — Open Account's build is untouched."

---

## 8 · Tradeoffs (2 min)

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

## 9 · Q&A (pad)

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
