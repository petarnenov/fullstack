# Login flow — стъпка по стъпка

Разходка през това какво се случва от момента, в който user-ът натисне **Sign in**, до момента, в който е на `/dashboard`, как сесията се пренася през всяка следваща API заявка и как се ротира, refresh-ва и revoke-ва.

Визуална версия: [`auth-flow.drawio`](./auth-flow.drawio). Архитектурен контекст (shell-owned auth, runtime SDK контракт): [`ARCHITECTURE.md`](./ARCHITECTURE.md#authentication). English version: [`AUTH_FLOW.md`](./AUTH_FLOW.md).

---

## Фаза 1 — Login request (от клика до cookie set)

### Стъпка 1 — User submit-ва формата

`packages/platform-shell/src/pages/LoginPage.tsx:42` — `onSubmit` вика `login(email, password)` от `useAuth()`.

### Стъпка 2 — Shell извиква API-то

`packages/platform-shell/src/auth/AuthContext.tsx:151` — `login()` делегира към `authApi.login({ email, password })`.

`packages/platform-shell/src/auth/authApi.ts:17` — axios с `withCredentials: true` прави `POST /api/auth/login`. Ключовият флаг: `withCredentials` казва на браузъра да приеме и запази cookies, които дойдат в response-а.

### Стъпка 3 — Vite proxy

Заявката е към `/api/auth/login` — same-origin относно шела (порт 5173). Vite dev proxy (`packages/platform-shell/vite.config.ts`) я препраща към `http://localhost:3000`.

### Стъпка 4 — API rate limit

`packages/api/src/domains/auth/auth.router.ts:17-22` — `loginRateLimit` middleware-ът (10 опита на минута per IP) връща `429` при flood. Първата защитна линия срещу credential-stuffing ботове.

### Стъпка 5 — Zod schema валидация

`auth.router.ts:35` — `LoginRequestSchema.safeParse` налага `{ email, password }` формата. Невалиден payload → `400`.

### Стъпка 6 — Password verification

`auth.router.ts:41-44` → `authRepository.verifyCredentials(email, password)`.

`auth.repository.ts:121-135`:

1. Намира user-а по email (case-insensitive).
2. **Ако няма такъв email** → въпреки това изпълнява `argon2.verify(DUMMY_HASH, password)` (резултатът се игнорира) и хвърля `InvalidCredentialsError`. Dummy hash-ът прави response-ите за непознати email-и със същото ~50 ms време като реалните — затваря user-enumeration timing side-channel-а.
3. **Ако user-ът съществува** → `argon2.verify(user.passwordHash, password)`. argon2id е memory-hard, constant-time и умишлено скъп, за да забави brute-force.

### Стъпка 7 — Issue session

`auth.router.ts:46` → `authRepository.issueSession(user.id)`.

`auth.repository.ts:137-169` генерира четири случайни стойности с `crypto.randomBytes`:

| Token | Размер | Функция |
| --- | --- | --- |
| `accessToken`  | 24 B hex | kратко-живеещ session identifier |
| `refreshToken` | 32 B hex | дълго-живеещ session identifier |
| `csrfToken`    | 16 B hex | double-submit anti-CSRF стойност |
| `familyId`     |  8 B hex | свързва всички горни в една "session family" |

Запазват се в два in-memory map-а: `accessSessions` (`token → { userId, expiresAt, csrfToken, familyId }`) и `refreshTokens` (`token → { userId, expiresAt, revoked, familyId }`).

### Стъпка 8 — Три `Set-Cookie` header-а

`auth.router.ts:47` → `setSessionCookies(res, session)`.

`authMiddleware.ts:43-57` вика `res.cookie()` три пъти с диференцирани атрибути:

```
Set-Cookie: amp_access_token=<24B>;  HttpOnly; SameSite=Lax;    Path=/api;      Max-Age=900
Set-Cookie: amp_refresh_token=<32B>; HttpOnly; SameSite=Strict; Path=/api/auth; Max-Age=604800
Set-Cookie: amp_csrf_token=<16B>;              SameSite=Strict; Path=/;         Max-Age=604800
```

Първите две са `HttpOnly` — невидими за JS, имунизирани срещу XSS-driven token кражба. CSRF cookie-то е JS-четимо, за да може шелът да го препубликува през SDK-то.

### Стъпка 9 — Response body

`auth.router.ts:48` — `res.json({ user, csrfToken })`. Токените са вече в cookies; body-то носи само това, което UI-ът има нужда да покаже (user за визуализация, csrfToken за `X-CSRF-Token` header-а на state-changing заявки).

### Стъпка 10 — Shell `adoptSession`

`AuthContext.tsx:52-61` — `adoptSession(user, csrfToken)`:

- Запазва csrf в `useRef` (stable getter, без re-render churn).
- Сетва `user` state-а и `status: "authenticated"`.
- `queryClient.invalidateQueries()` — всеки MFE widget с активни queries refetch-ва под новата самоличност.
- Чрез `useEffect` (line 71-87) публикува `window.__AMP_PLATFORM__ = { user, csrfToken, logout }` — runtime SDK контрактът, на който MFE-тата разчитат.

### Стъпка 11 — Redirect

`LoginPage.tsx:33` — щом `status === "authenticated"`, страницата рендира `<Navigate to={from}>`. User-ът каца на `/dashboard`.

---

## Фаза 2 — Как сесията пътува при следващи заявки

**Ключова идея**: нито шелът, нито MFE-тата държат токен в JS паметта повече. Браузърът държи cookies; JS държи само CSRF стойността (за request header-а).

Когато React Query вътре в MFE извика `billingApi.summary()`:

1. MFE-ският axios клиент (`packages/mfe-billing/src/api/index.ts:34-36`) има `withCredentials: true`. URL-ът е `/api/billing/summary` — same-origin (шелът на 5173).
2. Браузърът автоматично закача всяко cookie, чийто origin + path match-ват:
   - `amp_access_token` (Path=/api ✓)
   - `amp_csrf_token` (Path=/ ✓)
   - **НЕ** `amp_refresh_token` (Path=/api/auth не match-ва) — умишлено: refresh cookie-то е scope-нато така, че да се появява само на auth endpoint-и.
3. За GET: interceptor-ът излиза рано (`SAFE_METHODS.has(method)`).
4. За POST/PUT/DELETE: interceptor-ът чете `window.__AMP_PLATFORM__.csrfToken` и слага `X-CSRF-Token` header-а със същата стойност.

На wire-а изглежда:

```
GET /api/billing/summary
Cookie: amp_access_token=…; amp_csrf_token=…
```

---

## Фаза 3 — Server-side валидация

`packages/api/src/index.ts:27-29`:

```ts
app.use("/api/billing", requireAuth, requireCsrf, billingRouter);
```

Два middleware-а се изпълняват в ред:

### `requireAuth` (`authMiddleware.ts:65-82`)

1. Чете `req.cookies.amp_access_token` (попълнено от `cookie-parser`, wire-нат на `index.ts:20`).
2. Липсва → `401 "Not authenticated"`.
3. Вика `authRepository.findUserByAccessToken(token)`:
   - Търси в `accessSessions` map-а.
   - Ако липсва, или `expiresAt < now` → lazy-трие и връща `undefined`.
   - Иначе връща `{ user, csrfToken }`.
4. Не намерен → `401 "Invalid or expired session"`.
5. Закача `req.user` и `req.sessionCsrfToken` за route handler-а.

### `requireCsrf` (`authMiddleware.ts:92-108`)

1. За GET/HEAD/OPTIONS → `next()` (safe методите bypass-ват — четенето на данни не е CSRF цел).
2. За POST/PUT/DELETE:
   - Чете `X-CSRF-Token` header-а и `amp_csrf_token` cookie-то.
   - Ако някой липсва, или **не съвпадат → `403`**.
3. Защо това спира CSRF: cross-site атакуващ може да накара браузъра да прати cookies на cross-site POST (SameSite=Lax все още пуска някои), **но не може да прочете CSRF cookie-то** (SameSite=Strict на него) и **не може да сложи custom header без CORS preflight**, който сървърът ще отхвърли.

Ако двата middleware-а минат, billing route handler-ът работи с доверен `req.user`.

---

## Фаза 4 — Когато access-ът изтече (silent refresh)

Access cookie TTL е 15 минути; refresh е 7 дни. Няколко минути навътре в сесията, user-ът прави действие:

### Стъпка A

MFE извиква `/api/billing/summary`. Server-ският `findUserByAccessToken` връща `undefined` (expired запис). Response: `401`.

### Стъпка B

MFE response interceptor-ът (`mfe-billing/src/api/index.ts:45-54`) вижда 401 и dispatch-ва `CustomEvent("amp:auth-expired")` на `window`.

### Стъпка C

Shell listener-ът (`AuthContext.tsx:130-138`):

- Вика `tryRefresh()`, guarded от `refreshInFlight` ref-а — конкурентни 401s не тригерват конкурентни refresh заявки.
- `authApi.refresh(csrfToken)` прави `POST /api/auth/refresh` с:
  - `amp_refresh_token` cookie (браузърът го закача — path match-ва)
  - `amp_csrf_token` cookie (auto)
  - `X-CSRF-Token: <csrf value>` header

### Стъпка D — API `/refresh` handler (`auth.router.ts:62-81`)

1. `refreshRateLimit` (30/min).
2. `requireCsrf` — header-ът трябва да е равен на cookie-то.
3. `authRepository.rotateRefreshToken(refreshToken)`:
   - Ако token-ът вече е `revoked: true` → **reuse detection гърми** → `killFamily(familyId)` трие всеки access + refresh запис в семейството → `401`.
   - Иначе: маркира го revoked, вика `issueSession(userId, existingFamilyId)` — нови access + refresh + csrf токени, **същия `familyId`**.
4. `setSessionCookies(res, newSession)` → три нови `Set-Cookie` header-а (старите стойности презаписани в jar-а).
5. Body: `{ user, csrfToken: new }`.

### Стъпка E

Шелът вика `adoptSession(user, newCsrf)` — ref-ът обновен, CSRF cookie-то в браузъра вече ново. `queryClient.invalidateQueries()` → MFE повтаря провалилата се заявка с новото access cookie → `200`.

**Ако refresh fail-не** → `clearSession()` → `status: "anonymous"` → `<ProtectedRoute>` redirect-ва към `/login`.

---

## Фаза 5 — Logout

`AuthContext.tsx:117-127` — `doLogout()`:

1. `POST /api/auth/logout` с `X-CSRF-Token: <csrf>` (requireCsrf го изисква — logout е state промяна).
2. API handler (`auth.router.ts:83-88`): взима `amp_refresh_token` от cookies → `authRepository.revokeRefreshToken()` → `killFamily(familyId)` трие всеки access + refresh запис в семейството.
3. `clearSessionCookies(res)` — три `Set-Cookie` header-а с `Max-Age=0`, за да ги evict-не браузърът.
4. Shell `clearSession()` — `queryClient.clear()`, `user = null`, `status = "anonymous"`, `<Navigate to="/login"/>`.

Всички отворени табове, споделящи тази сесия, ще получат `401` на следващия API call → `amp:auth-expired` → шелът опитва refresh → `401` (семейството вече убито) → `clearSession()` → login page. Single logout, всички табове.

---

## Едно изречение

MFE-тата никога не пипат токен. Те имат `withCredentials: true` (оставят браузъра да носи сесията) и четат CSRF стойност от `window.__AMP_PLATFORM__` (за header-а на state-changing заявки). Сесията е server-side state (in-memory map-ове) плюс три cookies в browser-ския cookie jar. JS вижда само user обекта и CSRF стринга — и двете безопасни за гледане.
