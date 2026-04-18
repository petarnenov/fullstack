# Anticipated Q&A — Module Federation MFE POC Presentation

> A defensive briefing document. Reads every load-bearing claim in `PRESENTATION.md`, `ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `AUTH_FLOW.md` and the code, then lists the questions an engineering audience will plausibly ask, with direct answers, nuances, and the honest caveats.
>
> **How to use this document:** skim section titles to find the theme a question falls under. Each question has: a short answer you can give in 15–30 seconds on stage, and a deeper follow-up block for the 1-in-5 cases where someone pushes.

---

## Table of contents

1. [Strategy & motivation — why micro frontends at all](#1-strategy--motivation)
2. [Module Federation mechanics](#2-module-federation-mechanics)
3. [Shared singletons & dependency coordination](#3-shared-singletons--dependency-coordination)
4. [Composition patterns — orchestration & slots](#4-composition-patterns)
5. [Cross-MFE communication & cache coherence](#5-cross-mfe-communication)
6. [Authentication — cookie strategy](#6-authentication--cookie-strategy)
7. [Authentication — CSRF, refresh rotation, reuse detection](#7-authentication--csrf-refresh-rotation-reuse)
8. [Authentication — window SDK contract & multi-tab](#8-authentication--window-sdk-contract)
9. [API backend architecture](#9-api-backend-architecture)
10. [Swagger & type generation](#10-swagger--type-generation)
11. [CSS isolation & theming](#11-css-isolation--theming)
12. [Error handling, resilience, observability](#12-error-handling-resilience)
13. [Developer experience, standalone dev, CI/CD](#13-developer-experience-dev-modes)
14. [Performance & bundle size](#14-performance--bundle-size)
15. [Production readiness & what's deliberately missing](#15-production-readiness)
16. [Alternatives — iframes, Web Components, Nx, single-spa](#16-alternatives--comparisons)
17. [Organisational & process questions](#17-organisational--process-questions)
18. [Scaling the pattern — teams, MFEs, regions](#18-scaling-the-pattern)

---

## 1. Strategy & motivation

### 1.1 "Why micro frontends? Couldn't a well-modularised monolith do the same thing?"

**Short answer.** For 1–2 teams, yes — a clean monolith wins. The pattern is for 3+ teams shipping into one product where build-time coordination becomes the bottleneck: merge queues, release trains, one team's bug blocking another team's deploy. Micro frontends trade build-time coordination for runtime composition.

**Deeper.** The motivation is organisational, not technical. Conway's Law runs in both directions: if your teams are independent but your build isn't, the build becomes a political instrument. Slide 18 explicitly says don't do this with fewer than ~3 shipping teams. A well-modularised monolith with proper code-ownership (`CODEOWNERS`), lint-enforced import boundaries, and feature flags covers the 80% case cheaper.

---

### 1.2 "Isn't this just distributed monolith with extra steps?"

**Short answer.** It can become one if teams couple through shared state, shared types, or a shared-ui package that every remote depends on. We deliberately prevent that: **no shared code package**, contracts are duplicated (see `packages/mfe-billing/src/api/index.ts` vs `mfe-trading/src/api/index.ts` — both re-declare `PlatformSdk`), each MFE regenerates its own Swagger client. The only coupling is at runtime: shared React/Query singletons and the API HTTP contract.

**Deeper.** "Distributed monolith" means independent deployable units that can't be deployed independently. We check that by killing the billing remote (demo step 6): the shell degrades gracefully, the Dashboard widget shows an error boundary, every other page works. If killing one MFE broke the shell, we'd be a distributed monolith.

---

### 1.3 "Why 4 packages instead of one repo per team (polyrepo)?"

**Short answer.** Monorepo keeps the demo coherent — one `npm install`, one TypeScript project, one place to reason about versions. In production each team would own a separate repo with its own CI, and the monorepo structure translates 1:1 to polyrepo. The seam is the package name, not the folder.

**Deeper.** The bet: most teams want independent CI/CD and independent versioning, not independent `package.json` files. A monorepo with per-package builds gives you 90% of polyrepo benefit at 10% of the coordination cost. If you're at FAANG scale (50+ teams), polyrepo + a package registry may be unavoidable.

---

### 1.4 "You said 'autonomy' — but every team still uses React. Isn't that its own lock-in?"

**Short answer.** Yes, and we accept it. One React version across the platform is a version-coordination contract, not architectural autonomy. The win is that teams ship features independently between React upgrades, not that one team picks Vue while another picks Svelte. If you need framework autonomy, iframes or Web Components are your only option — but they cost more than they save.

**Deeper.** Framework-mix federation (React + Vue in one page) technically works with Module Federation, but it doubles runtime cost, breaks the shared-cache story (Query has no Vue counterpart you can share), and turns every design-system component into a custom-element wrapper. Slide 16 is explicit: "One React across remotes — version upgrades need coordination."

---

### 1.5 "Did you consider single-spa or qiankun instead of Module Federation?"

**Short answer.** single-spa is a meta-framework that predates Module Federation and solves lifecycle management (mount/unmount) — useful if you need to run multiple MFEs as separate SPAs with different frameworks. Module Federation solves dependency sharing at the bundler level and composes at the component level, which is closer to how React teams already think. For a React-only platform, MF is strictly simpler.

**Deeper.** You can actually combine them: single-spa for routing/lifecycle + Module Federation for dependency sharing. That's overkill for a 4-team React monoculture. qiankun is single-spa-plus-sandboxing and originated at Alibaba; great for iframe-like isolation, but the sandboxing mechanism is heavyweight and Chinese-ecosystem-dominant.

---

## 2. Module Federation mechanics

### 2.1 "Walk me through what actually happens when the shell boots."

**Short answer.** 1) Shell loads its own JS bundle from `:5173`. 2) React mounts, `AuthProvider` calls `GET /api/auth/me`, bootstraps session. 3) React-Router renders a route that contains `lazy(() => import("mfe_billing/OutstandingBalanceWidget"))`. 4) Vite's federation runtime fetches `http://localhost:5175/assets/remoteEntry.js`. 5) `remoteEntry.js` is a manifest that resolves `./OutstandingBalanceWidget` to the actual chunk URL. 6) Shell imports the chunk, which is a React component. 7) Shell renders it inside its own `QueryClientProvider` — so the widget uses the shell's Query cache.

**File reference.** `packages/platform-shell/vite.config.ts:24-32` (remotes), `packages/platform-shell/src/pages/DashboardPage.tsx` (lazy imports), `packages/platform-shell/src/components/MfeBoundary.tsx` (error + Suspense wrapper).

---

### 2.2 "Why not put `remoteEntry.js` behind a CDN with proper cache headers?"

**Short answer.** In the POC we don't — the shell hard-codes `http://localhost:5175/assets/remoteEntry.js`. In production you'd want: (a) the remote URLs to come from a runtime manifest (not baked into the shell build), (b) `remoteEntry.js` versioned but always-fresh (short TTL), (c) the actual chunks it points to immutable and long-TTL. That's how you ship a new remote without rebuilding the shell.

**Deeper.** The pattern is: `remoteEntry.js` is the index → it references content-hashed chunks → those chunks are `Cache-Control: max-age=31536000, immutable`. When a team deploys, only the tiny manifest needs to invalidate. We don't demo that because it adds infra complexity; slide 17 explicitly lists "hardcoded remote URLs" as a POC shortcut.

---

### 2.3 "What is `remoteEntry.js` actually, physically?"

**Short answer.** A small JS file (usually < 10 KB) emitted by the federation plugin at build time. It's an ES module that exports a `get(moduleName)` function and an `init(sharedScope)` function. When the shell asks for `./OutstandingBalanceWidget`, the runtime calls `get()` which dynamically imports the actual chunk. The chunk then runs in the same JS realm as the shell — shared React, shared Query, shared window globals.

**Deeper.** `remoteEntry.js` also declares which packages the remote has in its `shared` list and what versions it can accept. The runtime negotiates the highest compatible version between host and remotes at the first import. If the shell has React 18.3.1 and the remote has 18.2.0, the 18.3.1 wins because shell loads first.

---

### 2.4 "Why are the remote ports hard-coded in `vite.config.ts`?"

**Short answer.** POC pragmatism — predictable URLs for the demo script. `packages/platform-shell/vite.config.ts` reads `PUBLIC_HOST` from `.env` so you can swap `localhost` for a LAN IP and demo from a second laptop. In production the URLs come from a runtime manifest or an import-map, not the build.

**File reference.** `packages/platform-shell/vite.config.ts:24-32`; `CLAUDE.md` "LAN demo mode" section.

---

### 2.5 "What happens if a remote is offline when the page loads?"

**Short answer.** `MfeBoundary` catches the failed `import()`, renders a fallback that says "Couldn't load [label]." and preserves layout with `fallbackHeight`. The shell's other pages keep working. This is demoed live — we kill the billing process mid-talk.

**File reference.** `packages/platform-shell/src/components/MfeBoundary.tsx:17-44`; `packages/platform-shell/src/App.tsx:44-49`.

**Caveat.** The boundary catches render-time errors. Asynchronous errors inside a widget (e.g., an uncaught promise after mount) need their own handling — React error boundaries don't catch those.

---

### 2.6 "Can you expose hooks or utility functions via Module Federation, not just components?"

**Short answer.** Yes. `exposes` can point at any module — a hook, a context provider, a plain function. In our repo we only expose components because that's the pattern we wanted to teach. In practice, exposing a hook is useful when two teams need a shared piece of behaviour (e.g., a feature-flag hook) without duplicating the implementation.

**Caveat.** Exposing a hook creates a stronger contract than exposing a component — the hook's signature *is* the contract, and breaking it breaks every caller silently at runtime. For that reason we prefer to expose composable components with typed props, which the TypeScript ambient declarations in `platform-shell/src/vite-env.d.ts` pin down.

---

### 2.7 "What if two remotes expose the same module name, like `./Button`?"

**Short answer.** Namespaced by remote name: `mfe_billing/Button` and `mfe_trading/Button` are different imports. The federation plugin builds `mfe_<name>` from the `name` field in each remote's config. Two remotes can expose the same path; the shell picks which namespace it imports from.

---

## 3. Shared singletons & dependency coordination

### 3.1 "Why do React, react-dom, and @tanstack/react-query have to be shared?"

**Short answer.** React's Hooks dispatcher is stored on a module-level singleton (`ReactCurrentDispatcher`). Two React instances in the page = two dispatchers = `useState` inside a remote widget throws "invalid hook call" because it resolves to the wrong dispatcher. Same for react-dom (it owns the fiber reconciler). React Query's `QueryClient` context needs one class definition or `instanceof` checks and context lookups fail.

**Deeper.** The federation plugin handles this via "shared scope" — both host and remote register which packages they want shared; at load time the highest compatible version wins and every other copy resolves to the winning instance. If you forget to add a library to `shared` on one side, you'll see two copies and weird runtime bugs.

---

### 3.2 "Aren't shared singletons hidden coupling? How is this better than a shared-code package?"

**Short answer.** Shared singletons are runtime coupling on *behaviour* (React hooks). A shared-code package would be build-time coupling on *implementation* (every team imports from `@company/ui`). The first is cheap to rev (bump React, everyone gets the new runtime). The second is expensive (any change triggers every downstream rebuild and redeploy).

**Deeper.** The rule of thumb: if two teams have to agree on a thing, agree on a contract (HTTP, props, event names) not code. The exceptions are so foundational you can't easily rewrap them — React itself, the event loop. Everything else ships through the contract.

---

### 3.3 "What version of React are you actually running, and how is that enforced?"

**Short answer.** Today everyone points at the same `react`/`react-dom` in their `package.json`. The monorepo's single `node_modules` root (npm workspaces) means they all resolve to the same install. In polyrepo, you'd use version ranges (`"react": "^18.3.0"`) and Module Federation would negotiate at runtime — it picks the highest compatible version on the page.

**Caveat.** Semver compatibility is a promise, not a guarantee. If a minor React release breaks one team's code, the fix is to pin the exact version across teams until they migrate. That's version coordination; it's not free.

---

### 3.4 "What about libraries that aren't shared? Every MFE bundles its own axios — isn't that wasteful?"

**Short answer.** Yes, and it's deliberate. Sharing everything is a trap — the shared scope becomes a soft contract on versions, and teams lose the ability to pick their own HTTP client. We share only what needs to be a singleton (React's internal state). Small libraries like axios are cheap to duplicate; each copy is ~10 KB gzipped, and duplication lets each team upgrade on their own cadence.

**Deeper.** The heuristic: share if it holds cross-cutting state (React, Query, i18n providers, feature-flag SDK) — duplicate if it's a stateless utility (axios, date-fns, lodash).

---

### 3.5 "Does every MFE create its own `QueryClient`, or do they share one?"

**Short answer.** Depends on how the MFE is rendered. When the MFE runs standalone (`npm run dev:billing:standalone`), its `main.tsx` creates a local `QueryClient` and wraps its root in `QueryClientProvider`. When the MFE is consumed by the shell, only the exposed component mounts — not `main.tsx` — so it uses whatever `QueryClient` is above it in the React tree, which is the shell's. That's exactly how shell-to-MFE cache invalidation works for free.

**File reference.** `packages/mfe-billing/src/main.tsx:7-11` (standalone client), `packages/platform-shell/src/main.tsx` (shell client), `packages/mfe-billing/src/pages/BillingPage.tsx` (no `QueryClientProvider` — relies on ambient context).

**Caveat.** This is subtle and the single most common thing a careful reader will ask. If an MFE accidentally creates a `QueryClient` inside its exposed component, it would break the shared-cache pattern. We rely on convention — `main.tsx` for standalone, exposed components for composed — and a code reviewer noticing a misplaced provider.

---

## 4. Composition patterns

### 4.1 "Walk me through the two composition patterns."

**Short answer.** (1) **Orchestration:** the shell lazy-imports multiple widgets from different MFEs and assembles them — see `DashboardPage` pulling Billing's `OutstandingBalanceWidget`, Accounts' `OnboardingProgressWidget`, Trading's `PortfolioWidget`. (2) **Slot composition:** an MFE page reserves a `ReactNode` prop; the shell fills it with a widget from another MFE — see `OpenAccountPage` with a `billingSlot?: ReactNode` that the shell fills with `OutstandingBalanceWidget`. Both patterns come from the same primitive (expose + lazy import).

**File reference.** `packages/platform-shell/src/pages/DashboardPage.tsx` (orchestration); `packages/mfe-open-account/src/pages/OpenAccountPage.tsx:8-62` (slot definition); `packages/platform-shell/src/App.tsx:38-54` (slot wiring).

---

### 4.2 "Why not let `mfe-open-account` import from `mfe-billing` directly?"

**Short answer.** The rule: MFEs never import from each other. Cross-team composition happens only in the shell. If `mfe-open-account` imported `mfe-billing`, their release cycles would couple — Accounts would need to wait for a Billing deploy to ship a dependent change. The slot pattern preserves the independence: Accounts declares the shape of what it wants, the shell decides what to fill it with.

**Deeper.** This also makes testing trivial — Accounts unit-tests its page with a dummy React node as `billingSlot`, never needing to mock Billing's internals. And it means the shell is the only place you have to audit for cross-team coupling.

---

### 4.3 "Who owns the design of the slot? The provider (OpenAccount) or the consumer (shell)?"

**Short answer.** The hosting MFE owns the shape (type signature, layout, where the slot appears), the shell owns the fill (which widget, which props, error handling). Slot consumers sign a minimal contract: "I will render whatever ReactNode you hand me, inside my styling envelope." This is dependency inversion: Accounts depends on the *shape*, not the *implementation*.

**Caveat.** If Accounts later needs to know *anything* about what's in the slot ("is it a billing widget or an audit widget?"), the pattern breaks down and you'd reach for a more structured plugin registry. For a POC, a bare `ReactNode` prop is the simplest viable contract.

---

### 4.4 "What if the slotted widget fails? Does the host page crash?"

**Short answer.** No. The shell wraps the slot content in `<MfeBoundary>` before passing it in — see `App.tsx:44-49`. If the guest widget fails to load or throws, the boundary renders the fallback, and the hosting `OpenAccountPage` keeps working. This is the single most important discipline in slot composition: always wrap guest content in a boundary at the seam.

---

### 4.5 "Can a slot take props, or only a ReactNode?"

**Short answer.** In our implementation, only a `ReactNode`. The shell assembles the widget with its props before handing the pre-composed node to the slot. This keeps the Accounts-side type signature trivial and avoids leaking Billing's prop shape into Accounts' types. If you need more flexibility — e.g., the slot should render per-row in a list — you'd switch to a render-prop: `billingSlot?: (account: Account) => ReactNode`.

---

## 5. Cross-MFE communication

### 5.1 "If there's no event bus, how do MFEs talk to each other?"

**Short answer.** Three channels, in order of preference: (1) **Shared React Query cache** — when Billing pays an invoice, it invalidates `billingKeys.all`; any widget rendered under the shell's QueryClient (including a Billing widget on the Dashboard) refetches automatically. (2) **Backend** — if two MFEs need to coordinate on data, they coordinate through the API, not through each other. (3) **Custom events on `window`** — used only for auth expiry (`amp:auth-expired`). We try to avoid a general event bus because it becomes a dumping ground for untyped imperative coupling.

**File reference.** `packages/mfe-billing/src/components/InvoicesTable.tsx:23-28` (invalidate call); `packages/mfe-billing/src/widgets/OutstandingBalanceWidget.tsx` (consumer that refetches).

---

### 5.2 "Walk me through the cache-invalidation example concretely."

**Short answer.** 1) User clicks "Pay" in the Billing MFE's `InvoicesTable`. 2) `useMutation` fires `POST /api/billing/invoices/:id/pay`. 3) On success, the mutation's `onSuccess` calls `queryClient.invalidateQueries({ queryKey: billingKeys.all })`. 4) Because Billing runs inside the shell's `QueryClientProvider`, this hits the *shell's* QueryClient. 5) Every query registered under `["billing", ...]` becomes stale — including the `OutstandingBalanceWidget` on the Dashboard (which uses `billingKeys.summary()`). 6) React Query auto-refetches the stale query; the Dashboard widget updates.

**Why this matters.** No explicit pub/sub, no event bus, no shared state code. The only coordination is the `billingKeys` factory — and only *within* the Billing team. Cross-team, the widget just reads data via the same key factory.

---

### 5.3 "What if a Trading action needs to update a Billing widget? There's no `billingKeys` import in Trading."

**Short answer.** That's the point — Trading doesn't know about Billing's cache. If a Trading action has a domain effect on Billing (e.g., trades generate fees), the coordination happens on the backend: Trading posts the trade, the API updates both trading state and billing state, and both MFEs eventually refetch on their own staleTime (30s). For immediate UI coherence across teams, you'd broadcast a `window` event that both caches listen for — but we deliberately didn't build that because the pattern is a slippery slope.

**Caveat.** This is a real limitation. In production, if you need tight cross-MFE invalidation, you'd either (a) use a typed custom-event bus scoped to coordinated domains, or (b) push backend-originated invalidation signals via WebSocket/SSE. Both add infra; both should be justified by a concrete use case, not built up-front.

---

### 5.4 "What about consistency? If I open Billing and Trading in different tabs, do they agree?"

**Short answer.** Eventually, within `staleTime` (30s) + refetch. React Query is a cache, not a transactional store. If you need stronger guarantees (real-time cross-tab consistency), you'd add a WebSocket subscription or `BroadcastChannel` replication. For financial workflows where correctness matters, the truth is on the backend — the UI is best-effort display.

---

### 5.5 "Can two MFEs share state other than the Query cache — like Redux or Zustand?"

**Short answer.** Technically yes — declare the store library in `shared: [...]` and you get one instance across the page. In practice we avoid it. Shared client state is the thing that turns a micro-frontend architecture into a distributed monolith. If two MFEs need to look at the same state, that state probably belongs on the backend.

---

## 6. Authentication — cookie strategy

### 6.1 "Why cookies instead of JWTs in localStorage?"

**Short answer.** XSS resilience. An `httpOnly` cookie cannot be read by JavaScript, so a script-injection vulnerability can't exfiltrate the access token. localStorage is just JavaScript state — any XSS gets the token trivially. `httpOnly` cookies are the industry standard for first-party session management; localStorage tokens are acceptable only in very specific scenarios (native apps calling cross-origin APIs where cookies don't help).

**Deeper.** CSRF becomes the new concern (see §7), but CSRF has a well-understood mitigation (double-submit pattern) and doesn't leak credentials — XSS does.

---

### 6.2 "Walk me through the three cookies."

**Short answer.** (1) **`amp_access_token`** — opaque 48-hex-char session ID, `httpOnly`, `SameSite=Lax`, `path=/api`, 15-min TTL. Attached automatically to every `/api/*` call. (2) **`amp_refresh_token`** — 64-hex, `httpOnly`, `SameSite=Strict`, `path=/api/auth`, 7-day TTL. Sent only to auth endpoints. (3) **`amp_csrf_token`** — 32-hex, **NOT** `httpOnly` (so JS can read it), `SameSite=Strict`, `path=/`, 7-day TTL. Mirrored back in the `X-CSRF-Token` header on state-changing requests.

**File reference.** `packages/api/src/domains/auth/auth.router.ts` (cookie set headers); `AUTH_FLOW.md`.

---

### 6.3 "Why does the CSRF cookie need to be JS-readable when the access token isn't?"

**Short answer.** The double-submit pattern requires the client to *prove* it can read a cookie that a cross-origin attacker can't read. JS reads `amp_csrf_token` and puts it in the `X-CSRF-Token` header; the server compares header vs. cookie. A CSRF attacker's page can cause the browser to *send* cookies but cannot *read* them (because of cross-origin restrictions) — so they can't set the header correctly. Access token doesn't need this mechanism; it's just a session ID the browser ships automatically.

---

### 6.4 "Why is the access token an opaque ID, not a JWT?"

**Short answer.** Opaque tokens are revocable server-side (just delete from the session map). JWTs aren't — they're valid until expiry regardless of logout unless you maintain a blocklist, at which point you've lost JWT's main selling point. For first-party web sessions, opaque server-side tokens are strictly simpler and more secure. JWTs shine for stateless microservice-to-microservice auth, not user sessions.

---

### 6.5 "Why the path scoping on the cookies — `/api`, `/api/auth`, `/`?"

**Short answer.** Principle of least authority. `amp_access_token` is needed on every `/api/*` call, so its path is `/api`. `amp_refresh_token` is only needed by auth endpoints, so we scope it to `/api/auth` — it's never sent on non-auth calls, reducing exposure. `amp_csrf_token` is readable JS-wide, so path is `/`. Scoping isn't a hard security boundary, but it's defence in depth.

---

### 6.6 "What's the `Secure` flag situation? Does it work on HTTP in dev?"

**Short answer.** In production these are all `Secure` (HTTPS-only). In dev, Vite proxies `/api` to `localhost:3000` over HTTP, so `Secure` is dropped. If you misconfigure production without `Secure`, cookies will transit plaintext — which is why the auth code reads a `NODE_ENV` check.

---

## 7. Authentication — CSRF, refresh rotation, reuse detection

### 7.1 "Why CSRF if cookies are `SameSite=Strict`? Isn't that enough?"

**Short answer.** `SameSite=Strict` defends against classic CSRF (attacker's page triggering a form POST while user is logged in). But: some browsers downgrade to Lax for top-level navigations, older browsers don't honour SameSite, and `SameSite=Strict` blocks legitimate cross-site top-level links too. CSRF double-submit is belt-and-braces — it works even if SameSite fails, and it's one extra header on write operations. Defence in depth.

---

### 7.2 "Walk me through the refresh-rotation flow."

**Short answer.** 1) MFE makes an API call. 2) Server returns 401 (access token expired). 3) Axios response interceptor dispatches `window.dispatchEvent(new CustomEvent("amp:auth-expired"))`. 4) Shell listens for the event, calls `POST /api/auth/refresh` with the CSRF header. 5) Server verifies refresh cookie, generates new access + new refresh + new CSRF, marks the old refresh token as used, sets new cookies. 6) Shell updates `window.__AMP_PLATFORM__.csrfToken`. 7) The original failed request isn't retried automatically in this POC — the user-triggered action would need a retry, or the next navigation tick would succeed.

**File reference.** `packages/platform-shell/src/auth/AuthContext.tsx:86-103` (refresh logic), `packages/api/src/domains/auth/auth.repository.ts` (rotateRefreshToken, session family).

---

### 7.3 "What's refresh-token reuse detection?"

**Short answer.** Every refresh token has a `familyId` linking it to the original login. When a refresh token is *used*, it's marked consumed and replaced with a new one. If the *same* refresh token is ever presented again (either an attacker who stole a cookie, or a legitimate-but-racy retry), the server detects the reuse and kills the entire family — all tokens from that login are revoked, forcing re-authentication everywhere.

**Why.** Stolen refresh tokens are the worst-case session compromise because they're long-lived. Reuse detection limits the blast radius: the attacker and the legitimate user can't both be active simultaneously; the first reuse triggers the alarm.

**Caveat.** Legitimate concurrent refreshes can trigger false positives (two tabs refresh at the same instant). We mitigate with an in-flight refresh ref in `AuthContext` — `refreshInFlight` memoises the refresh promise so concurrent expirations share one round trip.

---

### 7.4 "Why not sliding sessions — just extend the access token on every call?"

**Short answer.** Sliding sessions on *every* request either (a) require a cookie write per request (performance), or (b) keep the access token long-lived and let it be stolen for a long time (security). The refresh pattern separates concerns: short access tokens limit theft blast radius, long refresh tokens avoid forcing re-login, and rotation + reuse detection catch the rare case where a refresh token does leak.

---

### 7.5 "What happens if the refresh endpoint itself is down?"

**Short answer.** `tryRefresh` in the shell returns false; `AuthContext` clears the session and the `ProtectedRoute` wrapper redirects to login. No open tabs stay in a zombie authenticated state. In practice, we'd want a retry with backoff for transient errors — the POC is single-attempt.

---

### 7.6 "Timing attacks on login?"

**Short answer.** Covered. If the email is unknown, the server still runs `argon2.verify(DUMMY_HASH, password)` and discards the result, so the response time is indistinguishable from a wrong-password-for-valid-email case. Without this, an attacker could enumerate valid emails by measuring response latency.

**File reference.** `packages/api/src/domains/auth/auth.repository.ts` (verifyCredentials with DUMMY_HASH fallback).

---

### 7.7 "Rate limiting? Is 10/min enough for login?"

**Short answer.** 10 login attempts/min per IP, 30 refresh attempts/min per IP. Good enough to prevent trivial credential stuffing from one IP, not enough for distributed attacks — that needs a WAF or CAPTCHA. The rate limiter is `express-rate-limit` in-memory, which means it resets on API restart and doesn't share state across instances. Production would use Redis-backed rate limiting.

---

## 8. Authentication — window SDK contract

### 8.1 "Why `window.__AMP_PLATFORM__`? Isn't that terrible practice?"

**Short answer.** It's the minimum viable contract for a 30-minute talk. The shell publishes a getter-based object when `AuthProvider` mounts; MFEs read it in their axios interceptor. Alternatives: (a) expose the SDK via Module Federation (more type-safe, more ceremony), (b) import-map with a virtual module (cleaner but requires SystemJS or equivalent tooling). The window bag is honest about what it is: a runtime plug point.

**Deeper.** A getter-based object means every read is fresh — the shell re-renders don't invalidate the SDK; the MFE always gets the current value. That's a deliberate design choice to prevent stale closures.

**File reference.** `packages/platform-shell/src/auth/platformSdk.ts:14-21,23-39` (interface + installer); each MFE's `api/index.ts` duplicates the interface (intentional, zero build coupling).

---

### 8.2 "Why duplicate the `PlatformSdk` interface in every MFE instead of a shared types package?"

**Short answer.** A shared types package is build-time coupling — the whole point of this architecture is to avoid that. Duplication is a conscious tax on the contract: if Shell changes the SDK shape, every MFE needs an explicit update, and that visibility is a feature, not a bug. The contract is small (3 fields), so the duplication cost is ~10 LOC per MFE.

**Deeper.** You can verify the contracts match with a small CI script that diffs the interface definitions across packages — that catches drift without creating a build dependency.

---

### 8.3 "What if an MFE loads before the shell has installed the SDK?"

**Short answer.** The axios interceptor reads `window.__AMP_PLATFORM__?.csrfToken ?? null`. If it's null, the request goes without CSRF — which the server will reject for state-changing calls. In practice, this never happens because `AuthProvider` installs the SDK synchronously during `useEffect`, before any MFE widget could mount and fetch. In standalone mode, the MFE runs its own demo login and installs the SDK itself.

**File reference.** `packages/mfe-billing/src/main.tsx:18-29` (standalone demo-login path).

---

### 8.4 "How does logout propagate to all tabs?"

**Short answer.** Logout calls `POST /api/auth/logout`, which revokes the refresh-token family server-side. Next time any tab makes an API call, it gets 401, fires `amp:auth-expired`, the refresh attempt fails (family is dead), and `AuthContext` redirects to login. Not instant across tabs; bounded by `staleTime` + next user action.

**Caveat.** For instant cross-tab logout, you'd use `BroadcastChannel` — listen for a "logout" message and force-clear local state. We don't, because it's incremental complexity for a demo.

---

### 8.5 "Why does the `amp:auth-expired` event use a `CustomEvent` on `window` instead of a callback registered at init?"

**Short answer.** Zero coupling between Shell and MFEs. If MFEs registered a callback, they'd need to know *how* to register it — i.e., which shell API. Custom events on `window` are the most universal contract: any JS anywhere can dispatch, anyone can listen. The MFE doesn't import anything from the shell; the shell doesn't know which MFEs exist.

---

## 9. API backend architecture

### 9.1 "Why is the API one process split by domain folders, not four separate services?"

**Short answer.** POC pragmatism. The *shape* (router, schemas, repository per domain, zero cross-domain imports) is the shape you'd use for microservices. Extracting into four services is a deployment choice — the code organisation is already microservice-shaped. One Express process makes local dev, ports, and CORS simple.

**File reference.** `packages/api/src/domains/{auth,billing,accounts,trading}/` — four parallel folders, each with `*.router.ts`, `*.schemas.ts`, `*.repository.ts`.

---

### 9.2 "What's stopping two domains from sharing code accidentally?"

**Short answer.** Convention + code review. There's no build-time enforcement. In production you'd add an `eslint-plugin-boundaries` rule: "files in `domains/billing` cannot import from `domains/trading`." For the POC, the four-folder parallel structure is the enforcement — any cross-domain import sticks out visually.

---

### 9.3 "Every repository is in-memory — how does that ever survive production?"

**Short answer.** It doesn't. In-memory repositories are a POC choice so restarts are fast and state is deterministic for demos. The *shape* — `XxxRepository` interface + concrete `InMemoryXxxRepository` implementation — is the same shape you'd use for Postgres-backed `PgXxxRepository`. Slide 17 calls this out explicitly.

**File reference.** All four `*.repository.ts` files — each exposes a concrete class, injected at router creation.

---

### 9.4 "How is the cross-domain `accountId` convention enforced?"

**Short answer.** It isn't — at all. Accounts, Billing, and Trading each have their own view of what an `accountId` means; the only contract is the string itself. Trading's cash ledger lazy-initialises 1 000 000 USD for any previously unseen `accountId`; Billing doesn't care which accounts exist in Trading; etc. Real systems look like this — `accountId` is a join key across otherwise-independent domain stores.

**Caveat.** In production you'd add referential integrity at the edges — e.g., Trading verifies the account exists via the Accounts API before accepting the first trade. The POC skips that to keep the happy path short.

---

### 9.5 "Where does auth verification happen in the backend?"

**Short answer.** `requireAuth` middleware in `packages/api/src/index.ts:36-40` — runs on `/api/billing`, `/api/accounts`, `/api/trading`. It looks up `amp_access_token` in the sessions map, attaches the user to `req`, and calls `next()` or returns 401. `requireCsrf` runs on the same routes for non-idempotent methods, comparing header vs. cookie.

---

### 9.6 "What's the Express version — and why not Fastify or Hono?"

**Short answer.** Express 4 because the ecosystem is the broadest and the audience knows it. Fastify is faster and more modern; Hono is the hot new thing for edge runtimes. For a POC, the choice doesn't matter — the domain-split pattern works on any HTTP framework. Swap layer is trivially small.

---

## 10. Swagger & type generation

### 10.1 "What's the flow from Swagger to TypeScript?"

**Short answer.** 1) `packages/api/src/swagger.ts` — hand-written OpenAPI document (source of truth). 2) `generateSwagger.ts` dumps it to `swagger.json`. 3) `swagger-typescript-api` reads the JSON and generates `src/api/generated/` in each consumer package (shell, billing, accounts, trading). 4) Each consumer imports types from its *own* generated folder — no cross-package type dependency.

**File reference.** `packages/api/src/swagger.ts`, `packages/api/src/generateSwagger.ts`; generated folders live in each frontend package.

---

### 10.2 "Why four copies of generated types instead of one shared `@amp/types`?"

**Short answer.** Build-time coupling again. A shared `@amp/types` means any schema change forces a rebuild of every consumer in lockstep. Per-package regeneration means each team upgrades independently — you can have Billing on v2 of the contract and Trading still on v1 as long as the HTTP contract is backward-compatible. The cost is four identical copies on disk; the benefit is independent deployability.

---

### 10.3 "What if the API adds a breaking change?"

**Short answer.** Run `npm run generate:types` from the root — it regenerates all four. Consumers whose code touches the changed endpoint will get TypeScript errors; others build and deploy as normal. In production you'd run type generation in CI against the freshly-built API, then run each MFE's typecheck, and fail the build on mismatch.

**Caveat.** We don't version the Swagger doc. A proper rollout would publish v1 and v2 in parallel, let each MFE migrate, then retire v1. That's infra, not code.

---

### 10.4 "Why hand-write OpenAPI instead of generating from Zod or decorators?"

**Short answer.** The Zod schemas live in each domain's `*.schemas.ts`. The Swagger doc duplicates the shapes by hand — which is redundant and can drift. A cleaner version would generate OpenAPI from Zod (`zod-to-openapi`). We didn't, because the POC Swagger is small and the audience wants to see *a* source-of-truth file, not chase generators. The pattern is the same either way.

---

### 10.5 "The generated files have `@ts-nocheck` at the top. Isn't that a bad sign?"

**Short answer.** `swagger-typescript-api` emits that by default because generators can't predict every project's strictness settings. The types themselves are sound; `@ts-nocheck` just bypasses local strictness to avoid generator-produced noise. Consumers wrap the generated types in their own narrow `api/index.ts` that *is* type-checked, so the `@ts-nocheck` never leaks outward.

---

## 11. CSS isolation & theming

### 11.1 "Why inline CSS via `vite-plugin-css-injected-by-js`?"

**Short answer.** Module Federation's Vite plugin doesn't load remote CSS files — only JS chunks. Without inlining, a federated widget would mount unstyled. The plugin bundles CSS into the JS and injects `<style>` tags at runtime. Cost: larger JS, non-cacheable CSS. Benefit: one load path, one failure mode.

**File reference.** All three MFE `vite.config.ts` files import the plugin.

---

### 11.2 "What about CSS bundle size? Isn't shipping CSS inside JS wasteful?"

**Short answer.** Yes, a bit. For each MFE it's tens of KB at most — acceptable for a platform with a few remotes, not great if you have 20. Production workarounds: extract CSS per remote, inject the `<link rel=stylesheet>` from the federation runtime; or ship a small CSS runtime that fetches the sheet on first widget mount. POC doesn't bother because the cost is tiny.

---

### 11.3 "How do you prevent CSS from one MFE leaking into another?"

**Short answer.** Three layers: (1) CSS Modules scope class names (`.BillingPage__title___abc123`). (2) Each MFE's page/widget root uses `isolation: isolate` to create a stacking context — z-indexes don't escape. (3) Design tokens come from shell-level CSS custom properties (`--text-muted`, `--border`), so theming is centralised.

**Caveat.** Global styles (body font, html resets) live in the shell and cascade into MFEs. If an MFE re-declares a global style, last-one-wins — load order matters.

---

### 11.4 "What about a modal from an MFE that needs to overlay the whole page?"

**Short answer.** Portals to `document.body` work normally — `isolation: isolate` only affects the stacking context *inside* the MFE's root. A portal escapes the root and renders at the body level, with its own z-index stack. For modals, toasts, tooltips, that's the correct pattern.

---

### 11.5 "Is there a shared design system?"

**Short answer.** No. Design tokens are duplicated in each MFE's CSS as custom properties. This is an explicit tradeoff — a shared UI package would couple every team to the design-system release cadence. The "correct" next step, if the teams grew, is a `@company/tokens` package containing only CSS variables (no components) — low coupling, easy to adopt.

**Deeper.** Pure-token packages are a compromise: they coordinate on visual language without coupling on component APIs. Full design-system packages (buttons, modals, etc.) are what you add in year 2 once teams are comfortable with the version dance.

---

## 12. Error handling, resilience

### 12.1 "What errors does `MfeBoundary` actually catch?"

**Short answer.** Render-time errors: a remote fails to load, an exposed component throws during render, a child component throws synchronously. It does NOT catch: errors in event handlers, async errors after mount (unhandled promises), errors during state-updater callbacks. For those, `react-error-boundary` + `window.onunhandledrejection` is the production pattern.

---

### 12.2 "What happens if the API is completely down?"

**Short answer.** `AuthProvider`'s bootstrap call (`GET /api/auth/me`) fails, `tryRefresh` fails, user lands on the login page. Every subsequent login attempt fails with a network error. The shell stays functional but empty. The UI doesn't pretend to be logged in — no zombie state.

---

### 12.3 "Is there any observability? Logging? Tracing?"

**Short answer.** No, in this POC. Production would need structured logs on the API (one log per request with domain, user, latency), Real User Monitoring on the shell (errors, MFE load failures, time-to-interactive per remote), and distributed tracing if you split the API into microservices. Adding observability is the first production task — slide 17 implies it.

---

### 12.4 "How do you debug a cross-MFE bug — data from Billing looks wrong on the Dashboard?"

**Short answer.** React Query DevTools (visible in dev) show every query, its state, and its timestamps. Because queries use the key factory (`billingKeys`), you can trace which MFE owns which query. Sources of "wrong" data usually narrow down to: a mutation didn't invalidate the right key, or two MFEs have diverged copies of generated types. Both are small fixes once you've seen them.

---

### 12.5 "What if a remote deploys a breaking change mid-session?"

**Short answer.** Old chunks keep working (immutable content-hashed URLs). `remoteEntry.js` is short-TTL, so the next page load picks up the new manifest. If the shell's exposed-module signature changed, the TS declaration in `vite-env.d.ts` catches it at build time — not at runtime. Runtime incompatibilities between shell and remote are possible but rare in practice.

---

## 13. Developer experience, dev modes

### 13.1 "How do the three dev modes work?"

**Short answer.** (1) **Full stack (`npm run dev` from root):** regenerates types, builds both MFE remotes (needed because Module Federation requires `remoteEntry.js` to exist), then runs API + both MFE previews + shell dev. (2) **Standalone MFE (`dev:billing:standalone`):** pure Vite dev with HMR, wrapped in its own `QueryClientProvider`, does a demo login so the page works without the shell. (3) **Built preview (`dev:billing`):** Vite preview serving the built bundle, so federation works but HMR doesn't — this is the mode the shell consumes.

**File reference.** Root `package.json` scripts; `packages/mfe-billing/src/main.tsx:18-29` (standalone demo-login).

---

### 13.2 "Why can't the shell just import MFEs via Vite dev with HMR?"

**Short answer.** Vite's federation plugin needs a built `remoteEntry.js` to resolve remote modules. In dev mode, Vite serves individual modules via ESM; federation's runtime model doesn't match. Workaround: MFEs use `vite preview` (serves the pre-built bundle) while the shell uses `vite dev` — shell gets HMR, MFEs don't. Teams iterate on MFEs in standalone mode (HMR works), then test composed mode against the built bundle.

---

### 13.3 "How do you test a change to a widget that's consumed by the shell?"

**Short answer.** Standalone mode is the fast loop. Iterate in `dev:billing:standalone` with HMR, confirm the widget works, then spin up the full stack to check composition. For automated testing, MFE-level tests (Jest + Testing Library) cover the widget in isolation; shell-level tests (with mocked remotes) cover integration. The POC doesn't ship frontend tests by design (CLAUDE.md: "No frontend tests. API tests exist; UI testing would be added by the consuming team").

---

### 13.4 "How does CI look — how do you know a remote won't break the shell?"

**Short answer.** The POC doesn't have CI wired up. Production pattern: (1) each MFE has its own CI — build, test, deploy. (2) The shell has a smoke test that spins up against the latest MFE builds and asserts each exposed module loads. (3) When a remote deploys, the shell's smoke test runs against the new remote; failure blocks the deploy. TS ambient declarations in `vite-env.d.ts` catch signature drifts at build time.

---

### 13.5 "Can we run this on LAN for a demo with two laptops?"

**Short answer.** Yes — set `PUBLIC_HOST=<LAN IP>` in root `.env` and `npm run dev`. The shell's `vite.config.ts` reads `PUBLIC_HOST` at config time and composes remote URLs from it. Every Vite server binds `host: true`. API proxy targets stay `localhost:3000` because the proxy runs on the dev machine, not in the browser.

**File reference.** `CLAUDE.md` "LAN demo mode" section.

---

## 14. Performance & bundle size

### 14.1 "What's the cost of Module Federation vs. a monolith SPA in first-paint?"

**Short answer.** Slower. The shell ships first, then fetches `remoteEntry.js` for each remote it needs, then each remote's chunks. On a cold load you pay 1 + N network round trips where N is the number of remotes on the first screen. Monolith SPAs ship one bundle. Mitigations: prefetch `remoteEntry.js` from the shell's `<head>`, HTTP/2 multiplexing, lazy-load remotes only for routes that need them.

---

### 14.2 "Do you code-split per MFE?"

**Short answer.** Yes, implicitly — each MFE is its own bundle, and the shell `lazy()`-loads remote modules. That means the Billing bundle only downloads when a Billing widget appears. Inside each MFE you can still code-split further (route-level) using normal Vite dynamic imports.

---

### 14.3 "Is React shared as one instance to all remotes, so we don't ship it four times?"

**Short answer.** Yes. `shared: ["react", "react-dom", "@tanstack/react-query"]` means the federation runtime delivers one copy that all remotes use. Chunks the remote builds still contain stubs (module declarations), but the actual code comes from the shared scope. Net effect: React ships once.

---

### 14.4 "What about the axios duplication we talked about earlier?"

**Short answer.** Every MFE bundles its own axios. ~10 KB gzipped per remote; with four remotes that's ~40 KB of duplication. Cheap enough for a POC; in production you might add axios to the shared scope if the HTTP client API stabilises.

---

### 14.5 "Any preloading tricks?"

**Short answer.** Not in the POC. Production: `<link rel="modulepreload">` for known-hot remote chunks, `Link` headers for HTTP/2 push, React's `startTransition` to keep the shell interactive while remotes hydrate. Slide 17 acknowledges these are production extensions, not POC.

---

## 15. Production readiness

### 15.1 "What's the gap between this POC and production?"

**Short answer.** The POC is *architecturally* production-shaped (domain split, auth patterns, error boundaries, refresh rotation) but missing operational layers: persistent databases, external IdP, CI/CD per MFE, observability, versioning of `remoteEntry.js`, rate limiting with shared state, secrets management. Each of those is a separate production task — none of them change the architecture.

**File reference.** `CLAUDE.md` "What is deliberately NOT here" + `PRESENTATION.md` slide 17.

---

### 15.2 "Can you ship with in-memory state?"

**Short answer.** No. Every restart wipes sessions, invoices, accounts, positions, cash. Production replaces each `InMemoryXxxRepository` with a `PgXxxRepository` or similar. The interface is already there — the change is isolated to the repository layer.

---

### 15.3 "Does the auth layer meet basic production bar?"

**Short answer.** Mostly yes, for patterns. argon2id for passwords ✓. httpOnly cookies ✓. Refresh rotation with reuse detection ✓. CSRF double-submit ✓. Rate limiting ✓ (though in-memory). Timing-attack mitigation ✓. What's missing: external IdP (SSO, MFA, user provisioning), audit logging, persistent rate-limit store, email/SMS for 2FA, password reset flow, account lockout, secure session store.

---

### 15.4 "What would you change to make this multi-region?"

**Short answer.** Three things: (1) session store moves from in-memory to Redis or a durable store with regional replication. (2) `remoteEntry.js` URLs come from a region-aware manifest (shell in EU fetches EU MFEs). (3) API traffic routes via GeoDNS to the nearest region. The architecture pattern doesn't change; the ops layer does.

---

### 15.5 "Disaster scenarios: what's the blast radius of a bad Billing deploy?"

**Short answer.** With Module Federation + error boundaries: the Billing widget on the Dashboard renders an error, every other page works, users can still log in and navigate. That's exactly what we demo live (step 6: kill the billing process). Compare: a monolith SPA with a bad Billing change corrupts the whole bundle; Billing's deploy either succeeds for everyone or blocks everyone.

---

### 15.6 "How do we roll back a bad MFE deploy fast?"

**Short answer.** `remoteEntry.js` points at a versioned chunk URL. Rollback = point the manifest back to the previous version. Ten-second change, no shell rebuild, no user-facing downtime.

---

## 16. Alternatives & comparisons

### 16.1 "Iframes would give perfect isolation. Why not iframes?"

**Short answer.** Iframes give *too much* isolation. No shared React instance → each iframe is its own SPA with its own bundle (4x React, 4x Query, 4x everything). No shared cache → cross-MFE coordination is hard. No shared routing → deep links are manual. No shared theme → CSS variables don't cross iframe boundaries. The shared-surface feeling of a single app is gone. Iframes are right for hostile content (ads, untrusted third parties), not for first-party teams.

---

### 16.2 "Web Components?"

**Short answer.** Good isolation (Shadow DOM), framework-agnostic — but you lose React's ecosystem inside a component boundary. Shared state management becomes custom-element-to-custom-element messaging. Styling across the shadow boundary is painful. Web Components shine when you need to ship a component to external consumers who may use any framework. Internal first-party teams on a React stack are better served by Module Federation.

---

### 16.3 "Why not Nx or Turborepo instead?"

**Short answer.** Nx and Turborepo are *build* tools — they give you monorepo task graphs, caching, affected-project detection. They don't give you runtime composition. You can combine Nx + Module Federation (official Nx support exists). For a POC focused on the runtime pattern, Nx adds complexity without teaching the core concept.

---

### 16.4 "What about import-maps (native browser feature)?"

**Short answer.** Import-maps give you runtime module resolution without a build-time federation plugin — you declare `{"react": "https://cdn.example.com/react@18.3.1.js"}` and every import of `react` resolves there. Pros: browser-native, no bundler magic. Cons: browser support still uneven (though improving), harder to do shared scope negotiation, tooling is immature. Module Federation + Vite has better DX today; import-maps will likely replace it in 3–5 years.

---

### 16.5 "What if we used a CDN-hosted React for all MFEs instead of shared scope?"

**Short answer.** Works, with caveats: every MFE must agree on the exact CDN URL (coordination), and you lose the shared-scope version negotiation that federation provides. If two MFEs point at different CDN versions of React, you're back to the two-instances-break-hooks problem. Module Federation's shared-scope is strictly more flexible.

---

### 16.6 "This looks like Next.js App Router with parallel routes. Same thing?"

**Short answer.** Parallel routes are a single Next.js app's composition pattern — still one team, one repo, one deploy. Module Federation is *runtime* composition across independently-deployable apps. The feel is similar; the deployment model is fundamentally different. If you don't need independent deploys, Next.js parallel routes are simpler.

---

## 17. Organisational & process questions

### 17.1 "Who owns the shell?"

**Short answer.** Platform Core team. They own auth, routing, theme, the Dashboard surface, and the contract governance. They're the bottleneck by design — every team ships into the shell's composed surface, so the shell team has veto power on contract changes. The tradeoff is that the shell team must be responsive; a slow shell team blocks everyone.

---

### 17.2 "What's the release cadence? Do teams coordinate releases?"

**Short answer.** No coordination required for independent features. Billing deploys billing, Trading deploys trading, shell deploys shell — each is a separate pipeline. Coordination is needed only when a contract changes (new exposed module, changed signature, shared library bump). Process: RFC-style proposal, consumer sign-off, stage rollout.

---

### 17.3 "How big does the shell team need to be?"

**Short answer.** Small. The shell is deliberately thin — nav, auth, routing, Dashboard. Business logic lives in MFEs. A platform team of 2–4 engineers is enough for 4–6 MFE teams. If the shell grows, it's a signal the shell is accreting business logic that belongs in an MFE.

---

### 17.4 "How do we handle shared user flows that span MFEs (e.g., 'open account → fund → first trade')?"

**Short answer.** Two options: (a) orchestration in the shell — shell defines the flow, embeds one MFE's widget per step. (b) One MFE owns the flow and embeds others via slots. (a) is preferred because the flow is a cross-cutting concern. The shell adds one page per flow; each MFE stays focused on its widget-level primitives.

---

### 17.5 "What happens when two teams disagree on the contract?"

**Short answer.** Shell team arbitrates. Their role is to keep contracts minimal and consumer-friendly. In practice, most disputes come from "we want a second prop on an exposed component" — usually resolvable by a richer slot API rather than a broader contract.

---

### 17.6 "How do you onboard a new team/MFE?"

**Short answer.** (1) Copy an existing MFE skeleton, rename. (2) Register its name + port in the shell's `vite.config.ts` remotes. (3) Add a TS ambient declaration in `vite-env.d.ts` for each exposed module. (4) Decide where the new widget composes — Dashboard, a new page, a slot. (5) Add a new domain folder in the API if the MFE has backend needs. Onboarding is ~a half day, not a week.

---

### 17.7 "Is there a standards doc for new teams?"

**Short answer.** In the POC, `CLAUDE.md` + `ARCHITECTURE.md` are it. Production: a platform-team-owned docs site with contract templates, example widgets, and "how to add a new MFE" runbooks. The docs are as important as the tooling — patterns rot without documentation.

---

## 18. Scaling the pattern

### 18.1 "Does this work for 10 teams? 20?"

**Short answer.** Yes, with more tooling. At 4 teams the shell can keep up manually; at 10+ you'd need a plugin registry (teams register their MFE's metadata — which widgets, which routes, which permissions — via a static file the shell reads), an RFC process for contract changes, and a dedicated platform team. The pattern holds; the process gets heavier.

---

### 18.2 "What if one MFE needs 50 widgets? Do we split it?"

**Short answer.** When an MFE's own codebase hits the same 3-team threshold we described at the start, split along team lines. A Trading MFE that grows to cover equities, derivatives, and FX is three teams' worth of code — time to become three MFEs (`mfe-trading-equities`, `mfe-trading-derivatives`, `mfe-trading-fx`) with a Trading domain lead who owns the shared Trading contracts. Recursive application of the same rule.

---

### 18.3 "How many remotes can the shell load before performance falls apart?"

**Short answer.** Depends on what's on the first screen. If the Dashboard needs widgets from 4 MFEs, that's 4 `remoteEntry.js` fetches + 4 chunk fetches. HTTP/2 handles it fine. At 10+ on one screen you'd see cumulative latency; the fix is to not put 10 remotes on one screen — lazy-load them by route, tab, or user action.

---

### 18.4 "Cross-MFE permissions — how does the Billing widget on the Dashboard know the user's role?"

**Short answer.** `window.__AMP_PLATFORM__.user.role`. The SDK exposes the current user; each MFE decides what to do with it. In practice, role checks live on the backend too (every API endpoint verifies auth + authorisation), so the UI check is just a rendering nicety. A user with no billing access sees an empty widget; the API wouldn't serve data anyway.

---

### 18.5 "How do we enforce that only authorised MFEs can be loaded?"

**Short answer.** Shell-level. The shell only registers the remotes it knows about; it won't `lazy()`-load arbitrary URLs. An attacker who controls a remote URL could serve anything — so `remoteEntry.js` URLs must come from trusted infrastructure (a CDN you control, a manifest signed at deploy time). CSP (Content-Security-Policy) headers on the shell limit where JS can load from; lock that down in production.

---

### 18.6 "Can users customise which MFEs they see?"

**Short answer.** Yes, at the shell level. The shell's routing and Dashboard composition are just React — guard by role, feature flag, user preference. Each user might see a different Dashboard; the MFE remotes loaded are a function of what's rendered. This is where the pattern shines: the composition surface *is* the customisation surface.

---

## Appendix A — "Show me the code" cheat sheet

Speaker cheat sheet for live follow-ups. Each pointer is a single keypress away in the demo.

| Topic | File + line |
|---|---|
| Shell's federation remotes | `packages/platform-shell/vite.config.ts:24-32` |
| MFE exposes (example: Trading) | `packages/mfe-trading/vite.config.ts:10-18` |
| TS ambient declarations for federated imports | `packages/platform-shell/src/vite-env.d.ts` |
| Shell's `QueryClient` | `packages/platform-shell/src/main.tsx` |
| Cross-MFE cache invalidation (pay invoice) | `packages/mfe-billing/src/components/InvoicesTable.tsx:23-28` |
| Slot composition — slot prop | `packages/mfe-open-account/src/pages/OpenAccountPage.tsx:8-62` |
| Slot composition — filler | `packages/platform-shell/src/App.tsx:38-54` |
| Error boundary | `packages/platform-shell/src/components/MfeBoundary.tsx:17-44` |
| Auth state machine | `packages/platform-shell/src/auth/AuthContext.tsx:41-163` |
| Window SDK install | `packages/platform-shell/src/auth/platformSdk.ts:14-39` |
| MFE axios interceptor (CSRF echo) | `packages/mfe-billing/src/api/index.ts:28-60` |
| Auth router (login, refresh, logout) | `packages/api/src/domains/auth/auth.router.ts:35-98` |
| Refresh rotation + reuse detection | `packages/api/src/domains/auth/auth.repository.ts` (`rotateRefreshToken`) |
| Trading cash ledger | `packages/api/src/domains/trading/trading.repository.ts` (`cashLedger`) |
| Swagger source of truth | `packages/api/src/swagger.ts` |
| Swagger → per-package generation | `packages/api/src/generateSwagger.ts` + root `package.json` `generate:types` |
| `vite-plugin-css-injected-by-js` | Each MFE `vite.config.ts:4` |
| `isolation: isolate` example | `packages/mfe-billing/src/pages/BillingPage.module.css` |

---

## Appendix B — "Things you shouldn't say on stage"

Questions that tempt a too-confident answer. Keep these honest.

- **"Is it production-ready?"** → "The *patterns* are production-shaped. The *implementation* is a POC — in-memory stores, hard-coded URLs, no observability. Each of those is a well-understood production task; none change the architecture."
- **"What's the downside?"** → "Coordination overhead on shared singletons (React, Query), runtime composition cost on first paint, and the shell team is a single point of contract governance. Those are real, not hypothetical."
- **"Would you use this at your company?"** → "I'd use it if I had 3+ teams with independent release cadences on one product. Below that threshold, a well-modularised monolith beats this every time."
- **"What if our team is React-shy?"** → "The pattern is React-independent — single-spa works with any framework mix. But the specific benefits we demoed (shared Query cache, shared context, shared router) all depend on a single framework. Mixed frameworks cost more than they save."
- **"Why did you pick POC over documented examples?"** → "Because documented examples hide tradeoffs. Running the thing means every load-bearing decision has a cost we had to eat — which is exactly what the audience needs to see before copying the pattern."

---

*Document prepared from full analysis of `PRESENTATION.md`, `ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `AUTH_FLOW.md`, and the source tree under `packages/`. Every claim in this document is load-bearing on a specific file or section of those inputs.*
