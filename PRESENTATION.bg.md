# Микро фронтенди — 30-минутно представяне

**Казус:** Asset Management Platform POC-ът в това репо.
**Формат:** slide-стил, по един момент на `##`. Речта на презентиращия е в blockquote-ове.
**Аудитория:** фронтенд инженери, които оценяват pattern-а.
**Бюджет:** 30 мин + 5 мин въпроси. Цели ~90 сек на slide.

---

## 0 · Заглавие и рамка (2 мин)

### Микро фронтенди на практика: какво избрахме, какво пропуснахме

> "Ще ви преведа през реална микро-фронтенд архитектура — не от теорията. Построихме платформа за управление на активи с 4 екипа за една седмица и ще покажа всяко load-bearing решение, което взехме, и колко струва."

Отвори репото успоредно:

- `README.md` — обхват накратко
- `ARCHITECTURE.md` — пълния дизайн
- Работещото приложение на http://localhost:5173

---

## 1 · Проблемът, който решаваме (2 мин)

### Един SPA спира да скалира при 3-ти екип

- Един екип, една codebase, един CI, един on-call — нормално.
- Три екипа, които push-ват в един SPA — merge-ите болят, release-ите се coupl-ват, bug в Billing блокира release на Open Account.
- Микро фронтендите разменят build-time координация за runtime композиция.

> "Истинската мотивация не е техническа, а организационна. Ако нямате 3+ екипа на един продукт — не ви трябва това."

---

## 2 · Какво е (и какво не е) микро фронтенд (2 мин)

| ТОВА Е                                                | ТОВА НЕ Е                                 |
| ----------------------------------------------------- | ----------------------------------------- |
| Модел за runtime композиция                           | Начин да се избегнат npm зависимости      |
| Граница на собственост (екип → пакет)                 | Оптимизация за производителност           |
| Независим build + deploy на парче                     | Извинение за пренаписване                 |
| Enabler за автономност на екипите                     | Безплатно — плащате в координация         |

> "Iframes, web components, Module Federation, import-maps — това са механизми. Pattern-ът е автономност на екип със споделена surface."

---

## 3 · Нашата карта на екипи и пакети (2 мин)

```
     Platform Core (shell)
     /       |        \    \
    /        |         \    \
 Billing  Open Acct   Trading   (+ споделено API)
```

| Екип          | Пакет                   | Порт | Притежава                                   |
| ------------- | ----------------------- | ---- | ------------------------------------------- |
| Platform Core | `@amp/platform-shell`   | 5173 | Shell, nav, auth, theme, Dashboard          |
| Billing       | `@amp/mfe-billing`      | 5175 | Invoices, transactions, balance widget      |
| Open Account  | `@amp/mfe-open-account` | 5174 | Onboarding wizard, progress widget          |
| Trading       | `@amp/mfe-trading`      | 5176 | Orders, positions, cash, portfolio widget   |
| (сервиз)      | `@amp/api`              | 3000 | Domain-split Express API (4 домейна)        |

**Именуване:** `mfe-<domain>` + shell + api. Името на пакета кодира границата на екипа.

---

## 4 · Механизмът: Module Federation (2 мин)

Всеки remote декларира какво expose-ва:

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

Shell-ът ги консумира по време на runtime:

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

**Това е цялата интеграция.** Три remote-а, три exposed модула всеки, нула споделен изходен код.

---

## 5 · Контрактът между екипите (2 мин)

> "Какво пресича границата на екипа?"

Само:

1. **Името на exposed модула** + подписа на default-експорта (компонент).
2. **Shared singleton-ите** декларирани в `shared:` списъка на federation.
3. **Runtime контракти, които надграждаме** (auth SDK, CSS токени) — явни, минимални.

Толкова. Без shared npm пакет. Без shared type import-и по време на build. Без вътрешни helper-и.

Всеки MFE регенерира собствения си API клиент от един и същ Swagger — дублирани контракти, нула build coupling.

> "Когато Billing прави rebuild, никой друг не rebuild-ва. Когато Billing deploy-ва, никой друг не deploy-ва. Можете ли да кажете това за текущия си монолит?"

---

## 6 · Shared singleton-и (1.5 мин)

```ts
shared: ["react", "react-dom", "@tanstack/react-query"]
```

### Защо всеки от тях е важен:

- **React / React DOM**: два инстанса чупят hooks-овете. Непосредствено.
- **@tanstack/react-query**: един `QueryClient` през всички MFE-та + shell. **Това е нашият cross-MFE messaging слой.**

Реален пример: плащане на invoice в `mfe-billing` invalidate-ва `billingKeys.all`. `OutstandingBalanceWidget` на Dashboard-а — в shell-а, но собственост на Billing — refetch-ва веднага. Без event bus, без prop drilling.

> "Shared cache е най-евтиният event bus, който някога ще притежавате."

---

## 7 · Жив момент: Dashboard композиция (1.5 мин)

Отвори http://localhost:5173 → Dashboard.

- 4 плочки, 4 team badge-а.
- Източник: `DashboardPage.tsx`, 3 `lazy(() => import("mfe_*/Widget"))` реда.
- Всеки widget fetch-ва собствени данни, чете същия token, пише в същия cache.
- **Плати invoice → outstanding balance пада. Без wiring.**

> "Това е визуалната отплата. Всичко на екрана е композирано; shell-ът е ~400 реда."

---

## 7a · Втори pattern: slot композиция (1.5 мин)

Dashboard = shell композира *нова* surface. Тук обратното: собствената страница на един екип резервира slot за widget на някой друг.

```tsx
// mfe-open-account/src/pages/OpenAccountPage.tsx  (Open Account екип)
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
// platform-shell/src/App.tsx  (Platform Core композира)
<OpenAccountPage
  billingSlot={
    <MfeBoundary label="Outstanding balance widget">
      <OutstandingBalanceWidget />
    </MfeBoundary>
  }
/>
```

- Пакетът `mfe-open-account` има **нула** import-а от `mfe_billing`.
- Контрактът е същият — "име + подпис на компонента", подписът просто включва `ReactNode` prop.
- Същият shared `QueryClient`: плати invoice на `/billing`, widget-ът в `/accounts` update-ва моментално.
- Вложеният `MfeBoundary` около slot-а означава, че Billing outage показва widget-размер грешка; onboarding pipeline-ът продължава да работи.

> "Два pattern-а, същите примитиви. Shell-ът е единственото място, на което е позволено да знае за два екипа едновременно."

---

## 8 · Auth — където екипите реално се coupl-ват (2.5 мин)

Auth-ът е първото място, където MFE pattern-ът тече. Опции:

1. **Всеки MFE със собствен login** → UX кошмар.
2. **Shared auth пакет** → връща build coupling.
3. **Shell притежава auth, публикува runtime SDK към remote-ите** ← избрахме това.

Сесията са три cookies, които API-то задава при login: `amp_access_token` (httpOnly, 15 мин), `amp_refresh_token` (httpOnly, SameSite=Strict, 7 дни), `amp_csrf_token` (JS-четим, SameSite=Strict). Access token-ите не стигат до JS — браузърът ги закача автоматично на same-origin заявки. Единственото, което MFE-тата четат от window-а, е CSRF стойността.

```ts
// platform-shell/src/auth/platformSdk.ts
export interface PlatformSdk {
  user: AuthenticatedUser | null;
  csrfToken: string | null;
  logout(): Promise<void>;
}
window.__AMP_PLATFORM__ = { user, csrfToken, logout };
```

```ts
// mfe-trading/src/api/index.ts — работи в axios на всеки MFE
const http = axios.create({ baseURL: "/api", withCredentials: true });

http.interceptors.request.use((config) => {
  const method = (config.method ?? "get").toLowerCase();
  if (["get", "head", "options"].includes(method)) return config;
  const csrf = window.__AMP_PLATFORM__?.csrfToken ?? null;
  if (csrf) config.headers.set("X-CSRF-Token", csrf);
  return config;
});
```

При 401, MFE-то fire-ва `amp:auth-expired` на `window`; shell-ът го хваща, прави silent `/api/auth/refresh` (който ротира и трите токена с reuse detection) и форсира logout ако refresh-ът пропадне.

**Cross-team контракт = един interface shape + едно име на event.** Дублиран inline във всеки MFE. Нула build coupling.

> "MFE-то никога не борави с credential. Чете CSRF токен, оставя браузъра да носи session cookie-то, а shell-ът владее ротацията + revocation-а. Това е production shape-ът на shell-owned auth."

---

## 9 · Theme — CSS токени като имплицитен контракт (1.5 мин)

Същият pattern приложен към дизайна:

```css
/* Дефинирани от shell-а */
[data-theme="dark"] {
  --bg: #0f1117;
  --text: #e8ebf2;
  --border: #2e3240;
  /* ... */
}
```

CSS модулите на всеки MFE реферират `var(--bg)`, `var(--text)` — не знаят кой ги е задал. Shell-ът пише `data-theme` на `<html>`; remote-ите наследяват.

Всеки MFE дефинира и собствени fallback токени в `index.css`, така че работи standalone (включително `@media (prefers-color-scheme: dark)`).

> "Shell-owned променливите са design-system контракт без design-system пакет. Същата decoupling история."

---

## 10 · Cross-domain данни: `accountId` като join key (2 мин)

Cash ledger-ът на Trading, invoice-ите на Billing и identity записите на Open Account всички реферират един и същ `accountId` — но **никой екип не import-ва repository на друг**.

```
api/src/domains/
├── auth/          (Platform Core)
├── billing/       (Billing)  — invoice-и tag-нати по accountId
├── accounts/      (Open Account) — притежава identity, KYC, product type
└── trading/       (Trading) — притежава positions + cash, keyed по accountId
```

Когато купиш AAPL на `acc_verified_1`:
- Trading debit-ва cash-а на този акаунт в собствения си `Map<accountId, number>`.
- Trading не пита Accounts дали акаунтът съществува (lazy-init на $1M).
- Invoice-ите на Billing за същия акаунт са незасегнати.

> "`accountId` е споделената конвенция. Всеки екип притежава собствения си срез на това какво е 'акаунт'. Точно така са структурирани реалните финансови системи: имаш customer ID, всеки екип има собствен view."

---

## 11 · Генерация на типове: един Swagger, четири клиента (1.5 мин)

```
api/src/swagger.ts        (source of truth, писан на ръка)
        │
        ▼  generateSwagger.ts
api/swagger.json
        │
        ├──► platform-shell/src/api/generated/   (само auth)
        ├──► mfe-billing/src/api/generated/
        ├──► mfe-open-account/src/api/generated/
        └──► mfe-trading/src/api/generated/
```

- **Генерацията се случва per-пакет** — не shared пакет.
- Trading чупи своя endpoint → само Trading не typecheck-ва; останалите незасегнати.
- Всеки MFE wrap-ва генерирания клиент в `api/index.ts` + React Query key factory.

> "Контрактите пътуват чрез регенерация, не чрез import-и. Това е decoupling дисциплината."

---

## 12 · CSS изолация в remote-ите (1 мин)

Federation плъгинът на Vite НЕ зарежда CSS файлове от remote-и. Без намеса widget-ите mount-ват нестилизирани.

Решение:

```ts
// vite.config.ts на всеки MFE
plugins: [
  cssInjectedByJsPlugin(),  // inlin-ва CSS в JS bundle-а
  federation({ ... }),
]
```

Плюс `isolation: isolate` на root контейнера на всеки MFE, така че стиловете да остават scope-нати.

> "Това е остър ръб. Пропуснеш ли го, federated страниците ти рендират без стилове в продукция. Тествай composed режима рано."

---

## 13 · Три dev режима на MFE (1.5 мин)

Всеки MFE поддържа:

1. **Standalone с HMR** (`npm run dev:trading:standalone`) → порт 5176, vite dev, собствен `QueryClient`, собствен Router. Team-local итерация.
2. **Built preview** (`npm run dev:trading`) → `vite preview` сервира dist/. Нужно, защото shell-ът консумира `remoteEntry.js`, който съществува само след `vite build`.
3. **Консумиран от shell-а** → `lazy(() => import("mfe_trading/…"))` на shell-а взима remote-а; MFE-то ползва provider-ите на shell-а.

> "Standalone режимът е как държиш екипа unblocked. Никога не ти трябват другите три процеса за да оправиш bug."

---

## 14 · Deploy независимост (blast radius историята) (1.5 мин)

Убий `mfe-billing` процеса → Billing widget-ът на dashboard-а показва error state през `<MfeBoundary>`. Всичко друго продължава да работи. Restart → widget-ът се връща.

- **Три различни CI pipeline-а, три различни release cadence-а.**
- Лош deploy на Billing не чупи Trading.
- Всеки `remoteEntry.js` може да живее на собствен CDN.

> "Това е най-голямата единична организационна печалба. По-малък blast radius = повече deploy-и = по-бързи екипи."

---

## 15 · Shell притежава platform concerns (1 мин)

Какво прави shell-ът и само shell-ът:

- Routing & навигация
- Auth (login, session, `<ProtectedRoute>`, `/api/auth/*`)
- Theme (`data-theme`, токени, `<ThemeToggle />`)
- Layout (sidebar, user card, logout)
- Error boundaries около зареждане на remote-и (`<MfeBoundary>`)
- Platform SDK (`window.__AMP_PLATFORM__`)

Какво shell-ът **не** прави:

- Fetch на Billing, Accounts или Trading данни.
- Знае вътрешни компоненти на MFE-то.
- Знае какво е position или invoice.

---

## 16 · Компромиси — честният slide (2 мин)

### Печелите

- **Автономност на екипа**: dev, build, deploy, on-call per екип.
- **Малък blast radius** при грешки.
- **Независими tech upgrade-и** в рамките на shared-singleton ограниченията.
- **Паралелна скорост**: 3 екипа ship-ват едновременно.

### Плащате

- **Един React** през remote-ите — version upgrade-ите са координирани.
- **CSS изолацията е ръчна** (CSS Modules + `isolation: isolate`).
- **Runtime композиция** = по-бавен first paint от SPA монолит.
- **Дисциплина за контракти нужна**: typed expose-и помагат, но хората все още трябва да enforce-ват.
- **Shell-ът е ново нещо за владеене** — някой трябва да работи Platform Core.
- **Debugging пресича 3 репа** когато нещо се счупи end-to-end.

> "Този pattern не е безплатен. Ако отговорът на 'колко екипа ship-ват тук' е 1-2, добре модуляризиран монолит ще го бие всеки път."

---

## 17 · Production upgrade-и, които съзнателно пропуснахме (1.5 мин)

Какво е POC-only в това репо и какво бихте сменили за реална работа:

| POC                                           | Production                                                     |
| --------------------------------------------- | -------------------------------------------------------------- |
| Window bag за auth SDK                        | Federation-exposed SDK ИЛИ import-map модул с typed stubs      |
| In-memory `authRepository` с demo потребители | Външен OIDC IdP (Keycloak / Auth0 / Cognito) за SSO + MFA      |
| Hardcoded remote URL-и във vite.config        | Build-time injection или runtime manifest + versioned URL-и    |
| In-memory domain repositories                 | Реални DB-та per домейн (или един DB, schema-separated)        |
| Няма shared дизайн система                    | `@company/tokens` пакет с CSS variables + компонентна lib      |
| Няма cross-MFE event bus                      | Shared cache покрива ~80%; добави typed events за останалото   |

Вече production-shaped в това POC: argon2id password hashing, httpOnly access + refresh cookies със SameSite, refresh-token ротация с reuse detection, CSRF double-submit, и rate-limiting на `/login` + `/refresh`. Остава да федерираш identity-то навън към IdP — не да hardening-ваш local flow-а.

---

## 18 · Кога НЕ да се прави това (1 мин)

Кажи не на микро фронтендите, ако:

- Имаш по-малко от ~3 ship-ващи екипа.
- Продуктът ти е една кохерентна surface, която се променя като цяло.
- Екипът ти няма infra maturity за 3 независими CI/CD pipeline-а.
- Не можеш да се ангажираш с координация на версии на React / core lib-и.
- Performance бюджетът ти не може да абсорбира runtime-композиция цената.

Добре структуриран монолит с ясни feature folder-и често е правилният отговор.

---

## 19 · Rекап + въпроси (1 мин)

Какво покрихме:

1. Граница екип → пакет (`mfe-<domain>` конвенция)
2. Module Federation: remote-и + exposed модули + shared singleton-и
3. Cross-team контрактът = exposed име + component signature. Нищо друго.
4. Два composition pattern-а: orchestration (Dashboard) + slot композиция (`OpenAccountPage.billingSlot`).
5. Cross-cutting concerns през runtime контракти: auth (window SDK), theme (CSS променливи), данни (accountId като join key).
6. Per-пакет type generation — decoupled контракти.
7. Три dev режима, три deploy режима.
8. Компромиси: автономност срещу координация.

**Карта на репото за по-дълбок read:**

- `ARCHITECTURE.md` — всички решения на едно място
- `DEMO_SCRIPT.md` — hands-on 30-мин walkthrough
- `CLAUDE.md` — load-bearing ограничения за всеки, който edit-ва репото
- `packages/platform-shell/vite.config.ts` — federation setup
- `packages/*/src/api/index.ts` — axios + auth interceptor (MFE pattern)

> "Въпроси? Изберете който slide и ще задълбая."

---

## Cheat sheet за презентиращия

| Момент                         | Slide  | Файл                                                            |
| ------------------------------ | ------ | --------------------------------------------------------------- |
| Team/package диаграма          | 3      | `ARCHITECTURE.md` отгоре                                        |
| Shell federation config        | 4      | `packages/platform-shell/vite.config.ts`                        |
| MFE `exposes`                  | 4      | `packages/mfe-trading/vite.config.ts`                           |
| Lazy import                    | 4, 7   | `packages/platform-shell/src/pages/DashboardPage.tsx`           |
| Slot композиция (MFE страна)   | 7a     | `packages/mfe-open-account/src/pages/OpenAccountPage.tsx`       |
| Slot композиция (shell страна) | 7a     | `packages/platform-shell/src/App.tsx` (`/accounts` route)       |
| Shared-cache invalidation      | 6      | `packages/mfe-billing/src/components/InvoicesTable.tsx`         |
| Auth SDK контракт              | 8      | `packages/platform-shell/src/auth/platformSdk.ts`               |
| MFE auth interceptor           | 8      | `packages/mfe-trading/src/api/index.ts`                         |
| Theme токени                   | 9      | `packages/platform-shell/src/index.css`                         |
| Cross-domain accountId         | 10     | `packages/api/src/domains/trading/trading.repository.ts`        |
| Swagger → 4 клиента            | 11     | `packages/api/package.json` → `generate:types:*`                |
| CSS injection плъгин           | 12     | `packages/mfe-trading/vite.config.ts`                           |
| MfeBoundary error state        | 14     | `packages/platform-shell/src/components/MfeBoundary.tsx`        |

**Timing pad:** ако бързаш — махни slide-ове 12 (CSS) и 15 (shell owns). Ако running long — пропусни 7a (slot композиция) ако аудиторията е вече убедена, или 13 (dev modes), който се припокрива с 14.
