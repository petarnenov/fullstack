# Login flow — step by step

A walkthrough of what happens from the moment the user clicks **Sign in** to the moment they're on `/dashboard`, how the session is carried across every subsequent API call, and how it's rotated, refreshed, and revoked.

For a visual version, see [`auth-flow.drawio`](./auth-flow.drawio). For the architectural rationale (shell-owned auth, runtime SDK contract), see [`ARCHITECTURE.md`](./ARCHITECTURE.md#authentication). Bulgarian version: [`AUTH_FLOW.bg.md`](./AUTH_FLOW.bg.md).

---

## Phase 1 — Login request (click to cookie-set)

### Step 1 — User submits the form

`packages/platform-shell/src/pages/LoginPage.tsx:42` — `onSubmit` calls `login(email, password)` from `useAuth()`.

### Step 2 — Shell calls the API

`packages/platform-shell/src/auth/AuthContext.tsx:151` — `login()` delegates to `authApi.login({ email, password })`.

`packages/platform-shell/src/auth/authApi.ts:17` — axios with `withCredentials: true` issues `POST /api/auth/login`. The crucial flag: `withCredentials` tells the browser to accept and persist any cookies returned in the response.

### Step 3 — Vite proxy

The request URL is `/api/auth/login` — same-origin relative to the shell (port 5173). The Vite dev proxy (`packages/platform-shell/vite.config.ts`) forwards it to `http://localhost:3000`.

### Step 4 — API rate limit

`packages/api/src/domains/auth/auth.router.ts:17-22` — the `loginRateLimit` middleware (10 attempts per minute per IP) returns `429` on flood. First line of defence against credential-stuffing bots.

### Step 5 — Zod schema validation

`auth.router.ts:35` — `LoginRequestSchema.safeParse` enforces the `{ email, password }` shape. Malformed payload → `400`.

### Step 6 — Password verification

`auth.router.ts:41-44` → `authRepository.verifyCredentials(email, password)`.

`auth.repository.ts:121-135`:

1. Find the user by email (case-insensitive).
2. **If no such email** → run `argon2.verify(DUMMY_HASH, password)` anyway (result discarded) and throw `InvalidCredentialsError`. The dummy hash makes unknown-email responses take the same ~50 ms as real ones — closes the user-enumeration timing side-channel.
3. **If the user exists** → `argon2.verify(user.passwordHash, password)`. argon2id is memory-hard, constant-time, and deliberately expensive to slow down brute-force.

### Step 7 — Issue the session

`auth.router.ts:46` → `authRepository.issueSession(user.id)`.

`auth.repository.ts:137-169` generates four random values with `crypto.randomBytes`:

| Token | Size | Purpose |
| --- | --- | --- |
| `accessToken`  | 24 B hex | short-lived session identifier |
| `refreshToken` | 32 B hex | long-lived session identifier |
| `csrfToken`    | 16 B hex | double-submit anti-CSRF value |
| `familyId`     |  8 B hex | ties all of the above into one "session family" |

They go into two in-memory maps: `accessSessions` (`token → { userId, expiresAt, csrfToken, familyId }`) and `refreshTokens` (`token → { userId, expiresAt, revoked, familyId }`).

### Step 8 — Three `Set-Cookie` headers

`auth.router.ts:47` → `setSessionCookies(res, session)`.

`authMiddleware.ts:43-57` calls `res.cookie()` three times with different attributes:

```
Set-Cookie: amp_access_token=<24B>;  HttpOnly; SameSite=Lax;    Path=/api;      Max-Age=900
Set-Cookie: amp_refresh_token=<32B>; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=604800
Set-Cookie: amp_csrf_token=<16B>;              SameSite=Strict; Path=/;         Max-Age=604800
```

The first two are `HttpOnly` — invisible to JS, immune to XSS-driven token theft. The CSRF cookie is JS-readable so the shell can republish it through the SDK.

### Step 9 — Response body

`auth.router.ts:48` — `res.json({ user, csrfToken })`. The tokens are already in cookies; the body only carries what the UI needs (user for display, csrfToken for the `X-CSRF-Token` header on state-changing requests).

### Step 10 — Shell `adoptSession`

`AuthContext.tsx:52-61` — `adoptSession(user, csrfToken)`:

- Stores csrf in a `useRef` (stable getter, no re-render churn).
- Sets `user` state and `status: "authenticated"`.
- `queryClient.invalidateQueries()` — every MFE widget with active queries refetches under the new identity.
- Via `useEffect` (line 71-87) publishes `window.__AMP_PLATFORM__ = { user, csrfToken, logout }` — the runtime SDK contract MFEs rely on.

### Step 11 — Redirect

`LoginPage.tsx:33` — once `status === "authenticated"`, the page renders `<Navigate to={from}>`. The user lands on `/dashboard`.

---

## Phase 2 — How the session travels on subsequent calls

**Key insight**: neither the shell nor the MFEs hold a token in JS memory any more. The browser holds the cookies; JS only holds the CSRF value (for the request header).

When React Query inside an MFE calls `billingApi.summary()`:

1. The MFE axios client (`packages/mfe-billing/src/api/index.ts:34-36`) has `withCredentials: true`. The URL is `/api/billing/summary` — same-origin (shell on 5173).
2. The browser automatically attaches every cookie whose origin + path match:
   - `amp_access_token` (Path=/api ✓)
   - `amp_csrf_token` (Path=/ ✓)
   - **Not** `amp_refresh_token` (Path=/api/auth doesn't match) — deliberate: the refresh cookie is scoped so it only surfaces on auth endpoints.
3. For GET: the interceptor returns early (`SAFE_METHODS.has(method)`).
4. For POST/PUT/DELETE: the interceptor reads `window.__AMP_PLATFORM__.csrfToken` and sets the `X-CSRF-Token` header to the same value.

The wire looks like:

```
GET /api/billing/summary
Cookie: amp_access_token=…; amp_csrf_token=…
```

---

## Phase 3 — Server-side validation

`packages/api/src/index.ts:27-29`:

```ts
app.use("/api/billing", requireAuth, requireCsrf, billingRouter);
```

Two middlewares run in order:

### `requireAuth` (`authMiddleware.ts:65-82`)

1. Read `req.cookies.amp_access_token` (populated by `cookie-parser`, wired on `index.ts:20`).
2. Missing → `401 "Not authenticated"`.
3. Call `authRepository.findUserByAccessToken(token)`:
   - Looks up the `accessSessions` map.
   - If missing, or `expiresAt < now` → lazy-deletes and returns `undefined`.
   - Otherwise returns `{ user, csrfToken }`.
4. Not found → `401 "Invalid or expired session"`.
5. Attach `req.user` and `req.sessionCsrfToken` for the route handler.

### `requireCsrf` (`authMiddleware.ts:92-108`)

1. For GET/HEAD/OPTIONS → `next()` (safe methods bypass — reading data is not a CSRF target).
2. For POST/PUT/DELETE:
   - Read `X-CSRF-Token` header and `amp_csrf_token` cookie.
   - If either is missing, or **they don't match → `403`**.
3. Why this stops CSRF: a cross-site attacker can make the browser send cookies on a cross-site POST (SameSite=Lax still allows some), **but they cannot read the CSRF cookie** (SameSite=Strict on that one) and **cannot set a custom header without a CORS preflight** the server would reject.

If both middlewares pass, the billing route handler runs with a trusted `req.user`.

---

## Phase 4 — When the access token expires (silent refresh)

Access cookie TTL is 15 minutes; refresh is 7 days. A few minutes into the session, the user performs an action:

### Step A

An MFE calls `/api/billing/summary`. The server's `findUserByAccessToken` returns `undefined` (expired record). Response: `401`.

### Step B

The MFE response interceptor (`mfe-billing/src/api/index.ts:45-54`) sees the 401 and dispatches `CustomEvent("amp:auth-expired")` on `window`.

### Step C

The shell listener (`AuthContext.tsx:130-138`):

- Calls `tryRefresh()`, guarded by the `refreshInFlight` ref — concurrent 401s don't trigger concurrent refresh requests.
- `authApi.refresh(csrfToken)` issues `POST /api/auth/refresh` with:
  - `amp_refresh_token` cookie (browser attaches — path matches)
  - `amp_csrf_token` cookie (auto)
  - `X-CSRF-Token: <csrf value>` header

### Step D — API `/refresh` handler (`auth.router.ts:62-81`)

1. `refreshRateLimit` (30/min).
2. `requireCsrf` — header must equal cookie.
3. `authRepository.rotateRefreshToken(refreshToken)`:
   - If the token is already `revoked: true` → **reuse detection fires** → `killFamily(familyId)` wipes every access + refresh record in the family → `401`.
   - Otherwise: mark it revoked, call `issueSession(userId, existingFamilyId)` — new access + refresh + csrf tokens, **same `familyId`**.
4. `setSessionCookies(res, newSession)` → three new `Set-Cookie` headers (old values overwritten in the jar).
5. Body: `{ user, csrfToken: new }`.

### Step E

The shell calls `adoptSession(user, newCsrf)` — ref updated, CSRF cookie in the browser already new. `queryClient.invalidateQueries()` → the MFE re-issues the failed query with the new access cookie → `200`.

**If refresh fails** → `clearSession()` → `status: "anonymous"` → `<ProtectedRoute>` redirects to `/login`.

---

## Phase 5 — Logout

`AuthContext.tsx:117-127` — `doLogout()`:

1. `POST /api/auth/logout` with `X-CSRF-Token: <csrf>` (requireCsrf enforces it — logout is a state change).
2. API handler (`auth.router.ts:83-88`): pulls `amp_refresh_token` from cookies → `authRepository.revokeRefreshToken()` → `killFamily(familyId)` deletes every access + refresh record in the family.
3. `clearSessionCookies(res)` — three `Set-Cookie` headers with `Max-Age=0` so the browser evicts them.
4. Shell `clearSession()` — `queryClient.clear()`, `user = null`, `status = "anonymous"`, `<Navigate to="/login"/>`.

All open tabs sharing this session will get a `401` on their next API call → `amp:auth-expired` → shell tries to refresh → `401` (family already killed) → `clearSession()` → login page. Single logout, all tabs.

---

## The one sentence

MFEs never touch a token. They set `withCredentials: true` (let the browser carry the session) and read a CSRF value off `window.__AMP_PLATFORM__` (for the header on state-changing requests). The session is server-side state (in-memory maps) plus three cookies in the browser's cookie jar. JS only ever sees the user object and the CSRF string — both safe to inspect.
