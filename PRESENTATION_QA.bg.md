# Очаквани въпроси и отговори — презентация на MFE POC с Module Federation

> Защитен брифинг документ. Чете всяко носещо твърдение в `PRESENTATION.bg.md`, `ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `AUTH_FLOW.bg.md` и в кода, след което изброява въпросите, които инженерна аудитория е логично да зададе, с директни отговори, нюанси и честни уговорки.
>
> **Как да го използваш:** огледай заглавията на секциите, за да откриеш темата, под която попада даден въпрос. Всеки въпрос съдържа: кратък отговор, който може да се даде от сцената за 15–30 секунди, и по-задълбочен follow-up блок за случаите (1 на 5), когато някой натиска по-сериозно.

---

## Съдържание

1. [Стратегия и мотивация — защо изобщо micro frontends](#1-стратегия-и-мотивация)
2. [Механика на Module Federation](#2-механика-на-module-federation)
3. [Споделени singleton-и и координация на зависимости](#3-споделени-singleton-и)
4. [Композиционни шаблони — orchestration и slot](#4-композиционни-шаблони)
5. [Комуникация между MFE и консистентност на кеша](#5-комуникация-между-mfe)
6. [Автентикация — стратегия за бисквитки](#6-автентикация--бисквитки)
7. [Автентикация — CSRF, refresh rotation, reuse detection](#7-автентикация--csrf-rotation-reuse)
8. [Автентикация — window SDK contract, multi-tab](#8-автентикация--window-sdk)
9. [Архитектура на API backend-а](#9-архитектура-на-api-backend-а)
10. [Swagger и генериране на типове](#10-swagger--генериране-на-типове)
11. [CSS изолация и theming](#11-css-изолация--theming)
12. [Обработка на грешки, устойчивост, observability](#12-обработка-на-грешки)
13. [Developer experience, standalone dev, CI/CD](#13-developer-experience)
14. [Производителност и размер на бъндъла](#14-производителност--bundle-size)
15. [Готовност за продукция и какво съзнателно липсва](#15-готовност-за-продукция)
16. [Алтернативи — iframes, Web Components, Nx, single-spa](#16-алтернативи--сравнения)
17. [Организационни и процесни въпроси](#17-организационни-въпроси)
18. [Мащабиране на шаблона — екипи, MFE-та, региони](#18-мащабиране-на-шаблона)

---

## 1. Стратегия и мотивация

### 1.1 "Защо micro frontends? Не може ли добре модуларизиран монолит да свърши същото?"

**Кратък отговор.** За 1–2 екипа — да, чист монолит печели. Шаблонът е за 3+ екипа, които пишат в един продукт и build-time координацията се превръща в bottleneck: merge queues, release trains, бъг в един екип блокира deploy на друг. Micro frontends сменят build-time координацията срещу runtime композиция.

**По-задълбочено.** Мотивацията е организационна, не техническа. Законът на Conway работи и в двете посоки: ако екипите ти са независими, но build-ът не е, build-ът се превръща в политически инструмент. Slide 18 изрично казва: не прави това при по-малко от ~3 shipping екипа. Добре модуларизиран монолит с правилен code-ownership (`CODEOWNERS`), lint-enforced import граници и feature flags покрива 80%-ия случай по-евтино.

---

### 1.2 "Това не е ли просто разпределен монолит с допълнителни стъпки?"

**Кратък отговор.** Може да стане такъв, ако екипите се свържат чрез споделено състояние, споделени типове или shared-ui пакет, от който всеки remote зависи. Съзнателно предотвратяваме това: **няма shared code пакет**, контрактите се дублират (виж `packages/mfe-billing/src/api/index.ts` срещу `mfe-trading/src/api/index.ts` — и двата предекларират `PlatformSdk`), всеки MFE регенерира собствен Swagger клиент. Единствената свързаност е runtime: споделени React/Query singleton-и и HTTP контрактът към API.

**По-задълбочено.** „Разпределен монолит" означава независимо deployable единици, които не могат да се деплойват независимо. Проверяваме го, убивайки billing remote-а (demo стъпка 6): shell-ът деградира грациозно, widget-ът на Dashboard показва error boundary, всяка друга страница работи. Ако убиването на един MFE счупи shell-а, сме разпределен монолит.

---

### 1.3 "Защо 4 пакета вместо едно repo на екип (polyrepo)?"

**Кратък отговор.** Monorepo държи демото кохерентно — едно `npm install`, един TypeScript проект, едно място, където мисля за версии. В продукция всеки екип би имал отделно repo със собствен CI, а структурата на monorepo-то се превежда 1:1 в polyrepo. Шевът е името на пакета, не папката.

**По-задълбочено.** Залогът: повечето екипи искат независим CI/CD и независимо версиониране, а не независими `package.json` файлове. Monorepo с per-package build-ове дава 90% от ползите на polyrepo срещу 10% от координационната цена. Ако си в FAANG мащаб (50+ екипа), polyrepo + package registry може да е неизбежно.

---

### 1.4 "Каза 'автономия' — но всеки екип все пак използва React. Това не е ли собствен lock-in?"

**Кратък отговор.** Да, и го приемаме. Една React версия в платформата е контракт за координация на версии, а не архитектурна автономия. Печалбата е, че екипите пускат фичи независимо между React ъпгрейдите, а не че един екип избира Vue, докато друг избира Svelte. Ако имаш нужда от framework автономия, iframes или Web Components са единствената опция — но струват повече, отколкото спасяват.

**По-задълбочено.** Framework-mix federation (React + Vue на една страница) технически работи с Module Federation, но удвоява runtime цената, чупи shared-cache story-то (Query няма Vue аналог за споделяне) и превръща всеки design-system компонент в custom-element wrapper. Slide 16 е ясен: „Един React в remote-овете — ъпгрейдите на версии изискват координация."

---

### 1.5 "Обмисли ли single-spa или qiankun вместо Module Federation?"

**Кратък отговор.** single-spa е мета-framework, който предшества Module Federation и решава lifecycle management (mount/unmount) — полезно, ако трябва да въртиш няколко MFE като отделни SPA с различни frameworks. Module Federation решава споделянето на зависимости на ниво bundler и композира на ниво компонент, което е по-близо до начина, по който React екипите вече мислят. За React-only платформа MF е строго по-просто.

**По-задълбочено.** Всъщност може да ги комбинираш: single-spa за routing/lifecycle + Module Federation за споделяне на зависимости. Това е overkill за 4-екипна React монокултура. qiankun е single-spa-plus-sandboxing и е родена в Alibaba; чудесна за iframe-like изолация, но sandbox механизмът е тежък и доминиран от китайската екосистема.

---

## 2. Механика на Module Federation

### 2.1 "Прекарай ме през това какво точно се случва, когато shell-ът стартира."

**Кратък отговор.** 1) Shell зарежда своя JS bundle от `:5173`. 2) React се монтира, `AuthProvider` вика `GET /api/auth/me`, bootstrap-ва сесията. 3) React Router рендерира route, който съдържа `lazy(() => import("mfe_billing/OutstandingBalanceWidget"))`. 4) Vite federation runtime-ът тегли `http://localhost:5175/assets/remoteEntry.js`. 5) `remoteEntry.js` е manifest, който превежда `./OutstandingBalanceWidget` в истинския chunk URL. 6) Shell-ът импортва chunk-а, който е React компонент. 7) Shell-ът го рендерира вътре в своя собствен `QueryClientProvider` — така widget-ът ползва Query cache-а на shell-а.

**File reference.** `packages/platform-shell/vite.config.ts:24-32` (remotes), `packages/platform-shell/src/pages/DashboardPage.tsx` (lazy imports), `packages/platform-shell/src/components/MfeBoundary.tsx` (error + Suspense wrapper).

---

### 2.2 "Защо не слагаме `remoteEntry.js` зад CDN с подходящи cache headers?"

**Кратък отговор.** В POC-а не го правим — shell-ът hard-code-ва `http://localhost:5175/assets/remoteEntry.js`. В продукция би искал: (а) remote URL-ите да идват от runtime manifest (не вградени в shell build-а), (б) `remoteEntry.js` версиониран, но винаги свеж (кратък TTL), (в) самите chunks, към които сочи, immutable и с дълъг TTL. Така изкарваш нов remote, без да рестартираш shell-а.

**По-задълбочено.** Шаблонът: `remoteEntry.js` е индекс → реферира content-hashed chunks → тези chunks са `Cache-Control: max-age=31536000, immutable`. Когато екип deploy-не, само малкият manifest трябва да се invalidate-не. Не го демонстрираме, защото добавя infra сложност; slide 17 изрично вписва „hardcoded remote URLs" като POC shortcut.

---

### 2.3 "Какво физически представлява `remoteEntry.js`?"

**Кратък отговор.** Малък JS файл (обикновено < 10 KB), emit-нат от federation плъгина в build time. Той е ES module, който експортва функция `get(moduleName)` и `init(sharedScope)`. Когато shell-ът пита за `./OutstandingBalanceWidget`, runtime-ът вика `get()`, която прави динамичен import на истинския chunk. Chunk-ът след това се изпълнява в същия JS realm като shell-а — споделен React, споделен Query, споделени window globals.

**По-задълбочено.** `remoteEntry.js` декларира и кои пакети remote-ът има в своя `shared` списък и кои версии приема. Runtime-ът преговаря най-високата съвместима версия между host-а и remote-овете на първия import. Ако shell-ът има React 18.3.1, а remote 18.2.0, 18.3.1 печели, защото shell-ът зарежда пръв.

---

### 2.4 "Защо remote портовете са hard-coded в `vite.config.ts`?"

**Кратък отговор.** POC прагматика — предсказуеми URL-ти за demo script-а. `packages/platform-shell/vite.config.ts` чете `PUBLIC_HOST` от `.env`, така че може да смениш `localhost` с LAN IP и да демонстрираш от втори лаптоп. В продукция URL-ите идват от runtime manifest или import-map, не от build-а.

**File reference.** `packages/platform-shell/vite.config.ts:24-32`; секцията „LAN demo mode" в `CLAUDE.md`.

---

### 2.5 "Какво се случва, ако remote е offline, когато страницата зарежда?"

**Кратък отговор.** `MfeBoundary` хваща неуспелия `import()`, рендерира fallback „Couldn't load [label]." и запазва layout-а с `fallbackHeight`. Другите страници на shell-а продължават да работят. Това се демонстрира на живо — убиваме билинг процеса по средата на talk-а.

**File reference.** `packages/platform-shell/src/components/MfeBoundary.tsx:17-44`; `packages/platform-shell/src/App.tsx:44-49`.

**Уговорка.** Boundary-то хваща render-time грешки. Асинхронни грешки вътре в widget (напр. необхванат promise след mount) имат нужда от собствена обработка — React error boundaries не ги хващат.

---

### 2.6 "Може ли да експозираш hooks или utility функции през Module Federation, не само компоненти?"

**Кратък отговор.** Да. `exposes` може да сочи към всеки модул — hook, context provider, проста функция. В repo-то експозираме само компоненти, защото такъв шаблон искахме да научим. На практика, exposing на hook е полезно, когато два екипа имат нужда от споделено поведение (напр. feature-flag hook), без да дублират имплементацията.

**Уговорка.** Exposing на hook създава по-силен контракт от exposing на компонент — сигнатурата на hook-а *е* контрактът и счупването ѝ тихомълком чупи всеки caller в runtime. По тази причина предпочитаме да експозираме композируеми компоненти с типизирани props, които TypeScript ambient декларации в `platform-shell/src/vite-env.d.ts` заключват.

---

### 2.7 "Какво става, ако два remote-а експозират модул със същото име, например `./Button`?"

**Кратък отговор.** Namespaced по remote име: `mfe_billing/Button` и `mfe_trading/Button` са различни imports. Federation плъгинът строи `mfe_<name>` от `name` полето в конфига на всеки remote. Два remote-а могат да експозират същия път; shell-ът избира от кой namespace да импортва.

---

## 3. Споделени singleton-и

### 3.1 "Защо React, react-dom и @tanstack/react-query трябва да бъдат споделени?"

**Кратък отговор.** React Hooks dispatcher-ът се съхранява в module-level singleton (`ReactCurrentDispatcher`). Две React инстанции на страницата = два dispatcher-а = `useState` вътре в remote widget хвърля „invalid hook call", защото се резолва към грешния dispatcher. Същото за react-dom (държи fiber reconciler-а). React Query `QueryClient` context-ът има нужда от една class дефиниция, иначе `instanceof` проверки и context lookups се чупят.

**По-задълбочено.** Federation плъгинът обработва това през „shared scope" — и host, и remote регистрират кои пакети искат споделени; при load-време най-високата съвместима версия печели и всяко друго копие се резолва към печелившата инстанция. Ако забравиш да добавиш библиотека в `shared` от една страна, ще видиш две копия и странни runtime бъгове.

---

### 3.2 "Споделените singleton-и не са ли скрита свързаност? С какво това е по-добро от shared-code пакет?"

**Кратък отговор.** Споделените singleton-и са runtime свързаност на *поведение* (React hooks). Shared-code пакет би бил build-time свързаност на *имплементация* (всеки екип импортва от `@company/ui`). Първото е евтино за обновяване (bump React, всички получават нов runtime). Второто е скъпо (всяка промяна тригерира rebuild + redeploy на всеки downstream).

**По-задълбочено.** Правилото: ако два екипа трябва да се споразумеят за нещо, споразумявай се за контракт (HTTP, props, event имена), а не за код. Изключенията са толкова фундаментални, че не могат лесно да се wrapne-ят — самия React, event loop-а. Всичко останало минава през контракта.

---

### 3.3 "Коя версия на React всъщност се изпълнява и как се налага това?"

**Кратък отговор.** Днес всеки сочи към същия `react`/`react-dom` в своя `package.json`. Единственият `node_modules` root на monorepo-то (npm workspaces) означава, че всички се резолват към същата инсталация. В polyrepo ще ползваш version ranges (`"react": "^18.3.0"`) и Module Federation ще преговаря в runtime — избира най-високата съвместима версия на страницата.

**Уговорка.** Semver съвместимостта е обещание, не гаранция. Ако minor React release счупи кода на един екип, fix-ът е да се pin-не точната версия в екипите, докато мигрират. Това е координация на версии; не е безплатна.

---

### 3.4 "Какво за библиотеки, които не са споделени? Всеки MFE bundle-ва свой axios — не е ли разхитително?"

**Кратък отговор.** Да, и е съзнателно. Споделянето на всичко е капан — shared scope-ът става мек контракт върху версии и екипите губят способността да избират собствения си HTTP клиент. Споделяме само това, което трябва да е singleton (вътрешното състояние на React). Малките библиотеки като axios са евтини за дублиране; всяко копие е ~10 KB gzipped, а дублирането позволява на всеки екип да upgrade-ва на собствен ритъм.

**По-задълбочено.** Евристиката: споделяй, ако държи cross-cutting state (React, Query, i18n providers, feature-flag SDK) — дублирай, ако е stateless utility (axios, date-fns, lodash).

---

### 3.5 "Всеки MFE ли създава собствен `QueryClient` или споделят един?"

**Кратък отговор.** Зависи как MFE се рендерира. Когато MFE работи standalone (`npm run dev:billing:standalone`), `main.tsx` създава локален `QueryClient` и wrap-ва root-а в `QueryClientProvider`. Когато MFE е консумиран от shell-а, само експозираният компонент се монтира — не `main.tsx` — така че използва каквото `QueryClient` е над него в React дървото, което е shell-ският. Точно така shell-to-MFE cache invalidation работи безплатно.

**File reference.** `packages/mfe-billing/src/main.tsx:7-11` (standalone клиент), `packages/platform-shell/src/main.tsx` (shell клиент), `packages/mfe-billing/src/pages/BillingPage.tsx` (няма `QueryClientProvider` — разчита на ambient context).

**Уговорка.** Това е фино и е единственото най-често нещо, което внимателен читател ще попита. Ако MFE по погрешка създаде `QueryClient` вътре в експозирания си компонент, ще счупи shared-cache шаблона. Разчитаме на конвенция — `main.tsx` за standalone, експозирани компоненти за композирано — и на code reviewer, който ще забележи неправилно поставен provider.

---

## 4. Композиционни шаблони

### 4.1 "Прекарай ме през двата композиционни шаблона."

**Кратък отговор.** (1) **Orchestration:** shell-ът lazy импортва множество widget-и от различни MFE и ги асемблира — виж `DashboardPage`, който издърпва `OutstandingBalanceWidget` от Billing, `OnboardingProgressWidget` от Accounts, `PortfolioWidget` от Trading. (2) **Slot composition:** MFE страница резервира `ReactNode` prop; shell-ът го запълва с widget от друг MFE — виж `OpenAccountPage` с `billingSlot?: ReactNode`, който shell-ът запълва с `OutstandingBalanceWidget`. И двата шаблона идват от същия примитив (expose + lazy import).

**File reference.** `packages/platform-shell/src/pages/DashboardPage.tsx` (orchestration); `packages/mfe-open-account/src/pages/OpenAccountPage.tsx:8-62` (slot дефиниция); `packages/platform-shell/src/App.tsx:38-54` (slot wiring).

---

### 4.2 "Защо не позволяваме на `mfe-open-account` да импортва от `mfe-billing` директно?"

**Кратък отговор.** Правилото: MFE-та никога не импортват едно от друго. Cross-team композиция се случва само в shell-а. Ако `mfe-open-account` импортваше `mfe-billing`, release циклите им щяха да се свържат — Accounts щеше да трябва да чака Billing deploy, за да пусне зависима промяна. Slot шаблонът запазва независимостта: Accounts декларира формата на това, което иска; shell-ът решава с какво да го запълни.

**По-задълбочено.** Това прави тестването тривиално — Accounts unit-тества страницата си с dummy React node като `billingSlot`, без да mock-ва Billing внутрешности. И означава, че shell-ът е единственото място, което трябва да одитираш за cross-team свързаност.

---

### 4.3 "Кой притежава дизайна на slot-а? Provider-ът (OpenAccount) или consumer-ът (shell)?"

**Кратък отговор.** Хостващото MFE притежава формата (type signature, layout, къде се появява slot-ът), shell-ът притежава запълнителя (кой widget, с кои props, error handling). Slot consumer-ите подписват минимален контракт: „Ще рендерирам каквото ReactNode ми дадеш, вътре в моя styling envelope." Това е dependency inversion: Accounts зависи от *формата*, не от *имплементацията*.

**Уговорка.** Ако по-късно Accounts трябва да знае *каквото и да е* за това какво има в slot-а („билинг widget или audit widget?"), шаблонът се чупи и ще посегнеш към по-структуриран plugin registry. За POC гол `ReactNode` prop е най-простият жизнеспособен контракт.

---

### 4.4 "Какво става, ако slotted widget-ът откаже? Падне ли хостващата страница?"

**Кратък отговор.** Не. Shell-ът wrap-ва slot съдържанието в `<MfeBoundary>`, преди да го подаде — виж `App.tsx:44-49`. Ако гост-widget-ът не се зареди или хвърли, boundary-то рендерира fallback, а хостващата `OpenAccountPage` продължава да работи. Това е единствената най-важна дисциплина в slot композицията: винаги wrap-вай guest съдържанието в boundary на шева.

---

### 4.5 "Може ли slot да приема props или само ReactNode?"

**Кратък отговор.** В нашата имплементация — само `ReactNode`. Shell-ът асемблира widget-а с неговите props, преди да подаде предварително композирания node на slot-а. Това пази Accounts-страничната сигнатура тривиална и избягва пропускането на Billing prop формата в Accounts типовете. Ако имаш нужда от повече гъвкавост — напр. slot-ът трябва да рендерира per-row в списък — ще превключиш към render-prop: `billingSlot?: (account: Account) => ReactNode`.

---

## 5. Комуникация между MFE

### 5.1 "Ако няма event bus, как MFE-тата си говорят?"

**Кратък отговор.** Три канала, по ред на предпочитание: (1) **Споделен React Query cache** — когато Billing плати фактура, invalidate-ва `billingKeys.all`; всеки widget, рендериран под QueryClient-а на shell-а (включително Billing widget на Dashboard), автоматично refetch-ва. (2) **Backend** — ако две MFE-та трябва да координират данни, координират се през API, не едно през друго. (3) **Custom events на `window`** — използвани само за auth expiry (`amp:auth-expired`). Избягваме общ event bus, защото се превръща в бунище за нетипизирано imperative coupling.

**File reference.** `packages/mfe-billing/src/components/InvoicesTable.tsx:23-28` (invalidate вик); `packages/mfe-billing/src/widgets/OutstandingBalanceWidget.tsx` (consumer, който refetch-ва).

---

### 5.2 "Прекарай ме през примера за cache-invalidation конкретно."

**Кратък отговор.** 1) Потребителят натиска „Плати" в `InvoicesTable` на Billing MFE. 2) `useMutation` изстрелва `POST /api/billing/invoices/:id/pay`. 3) При успех `onSuccess` mutation-ът вика `queryClient.invalidateQueries({ queryKey: billingKeys.all })`. 4) Понеже Billing работи вътре в `QueryClientProvider` на shell-а, това удря *shell-ския* QueryClient. 5) Всяка заявка, регистрирана под `["billing", ...]`, става stale — включително `OutstandingBalanceWidget` на Dashboard (която ползва `billingKeys.summary()`). 6) React Query auto-refetch-ва stale заявката; widget-ът на Dashboard се обновява.

**Защо има значение.** Няма expricit pub/sub, няма event bus, няма код за споделено състояние. Единствената координация е фабриката `billingKeys` — и само *вътре* в Billing екипа. Cross-team, widget-ът просто чете данни през същата key factory.

---

### 5.3 "Ако Trading действие трябва да обнови Billing widget? В Trading няма `billingKeys` import."

**Кратък отговор.** Точно това е целта — Trading не знае за Billing cache-а. Ако Trading действие има domain effect върху Billing (напр. trades генерират такси), координацията се случва на backend-а: Trading постваме trade-а, API-то обновява и trading state, и billing state, и двете MFE-та eventually refetch-ват на своя staleTime (30s). За незабавна UI кохерентност през екипи ще broadcast-неш `window` event, който и двата cache-а слушат — но съзнателно не сме го построили, защото шаблонът е хлъзгав наклон.

**Уговорка.** Това е реално ограничение. В продукция, ако имаш нужда от тясна cross-MFE инвалидация, или (а) ще използваш типизиран custom-event bus, scope-нат към координирани domains, или (б) ще push-неш backend-originated invalidation сигнали през WebSocket/SSE. И двете добавят infra; и двете трябва да са оправдани от конкретен use case, а не предварително построени.

---

### 5.4 "Какво за консистентност? Ако отворя Billing и Trading в различни табове, съгласни ли са?"

**Кратък отговор.** Eventually, в рамките на `staleTime` (30s) + refetch. React Query е cache, не транзакционен store. Ако имаш нужда от по-силни гаранции (real-time cross-tab консистентност), ще добавиш WebSocket subscription или `BroadcastChannel` репликация. За финансови workflow-и, където коректността има значение, истината е на backend-а — UI-ът е best-effort display.

---

### 5.5 "Могат ли две MFE-та да споделят състояние, различно от Query cache-а — като Redux или Zustand?"

**Кратък отговор.** Технически — да. Декларирай store библиотеката в `shared: [...]` и получаваш една инстанция на страницата. На практика избягваме. Споделеният client state е нещото, което превръща micro-frontend архитектура в разпределен монолит. Ако две MFE-та трябва да гледат същото състояние, това състояние вероятно принадлежи на backend-а.

---

## 6. Автентикация — бисквитки

### 6.1 "Защо бисквитки вместо JWT в localStorage?"

**Кратък отговор.** XSS устойчивост. `httpOnly` бисквитка не може да бъде прочетена от JavaScript, така че script-injection уязвимост не може да exfiltrate access token-а. localStorage е просто JavaScript state — всеки XSS взема token-а тривиално. `httpOnly` бисквитки са индустриален стандарт за first-party session management; localStorage токените са приемливи само в много специфични сценарии (native apps, викащи cross-origin API-та, където бисквитките не помагат).

**По-задълбочено.** CSRF става новата грижа (виж §7), но CSRF има добре разбран mitigation (double-submit pattern) и не изтича credentials — XSS изтича.

---

### 6.2 "Прекарай ме през трите бисквитки."

**Кратък отговор.** (1) **`amp_access_token`** — opaque 48-hex session ID, `httpOnly`, `SameSite=Lax`, `path=/api`, 15-мин TTL. Закачен автоматично на всеки `/api/*` вик. (2) **`amp_refresh_token`** — 64-hex, `httpOnly`, `SameSite=Strict`, `path=/api/auth`, 7-дневен TTL. Изпратен само на auth endpoints. (3) **`amp_csrf_token`** — 32-hex, **НЕ** `httpOnly` (така че JS може да я чете), `SameSite=Strict`, `path=/`, 7-дневен TTL. Огледана обратно в `X-CSRF-Token` header на state-changing заявки.

**File reference.** `packages/api/src/domains/auth/auth.router.ts` (cookie set headers); `AUTH_FLOW.bg.md`.

---

### 6.3 "Защо CSRF бисквитката трябва да е JS-readable, когато access token не е?"

**Кратък отговор.** Double-submit pattern изисква клиентът да *докаже*, че може да чете бисквитка, която cross-origin атакуващ не може да чете. JS чете `amp_csrf_token` и го слага в `X-CSRF-Token` header; сървърът сравнява header срещу cookie. Страницата на CSRF атакуващ може да накара браузъра да *изпрати* бисквитки, но не може да ги *чете* (заради cross-origin ограничения) — така че не може да сетне header-а правилно. Access token не се нуждае от този механизъм; той е просто session ID, който браузърът изпраща автоматично.

---

### 6.4 "Защо access token-ът е opaque ID, а не JWT?"

**Кратък отговор.** Opaque токените са отзиваеми server-side (просто delete-ват се от session map-а). JWT-тата не са — валидни са до expiry, независимо от logout, освен ако не поддържаш blocklist, а в този момент губиш основното предимство на JWT. За first-party web сесии server-side opaque токените са строго по-прости и по-сигурни. JWT-тата блестят за stateless microservice-to-microservice auth, не user сесии.

---

### 6.5 "Защо path scoping на бисквитките — `/api`, `/api/auth`, `/`?"

**Кратък отговор.** Принцип на най-малко правомощие. `amp_access_token` е нужен на всеки `/api/*` вик, така че path-ът му е `/api`. `amp_refresh_token` е нужен само на auth endpoints, затова го scope-ваме до `/api/auth` — никога не се изпраща на non-auth викове, намалявайки exposure-а. `amp_csrf_token` е JS-readable в цялото приложение, така че path-ът е `/`. Scoping-ът не е твърда граница за сигурност, но е defence in depth.

---

### 6.6 "Каква е ситуацията с `Secure` флага? Работи ли на HTTP в dev?"

**Кратък отговор.** В продукция всички са `Secure` (HTTPS-only). В dev Vite proxy-ва `/api` към `localhost:3000` през HTTP, така че `Secure` се дропва. Ако неправилно конфигурираш продукция без `Secure`, бисквитките ще минават в открит текст — точно затова auth кодът чете `NODE_ENV`.

---

## 7. Автентикация — CSRF, rotation, reuse

### 7.1 "Защо CSRF, ако бисквитките са `SameSite=Strict`? Не е ли достатъчно?"

**Кратък отговор.** `SameSite=Strict` защитава срещу класически CSRF (страницата на атакуващия тригерира form POST, докато user-ът е logged in). Но: някои браузъри downgrade-ват до Lax за top-level navigations, по-старите браузъри не спазват SameSite, а `SameSite=Strict` блокира и легитимни cross-site top-level link-ове. CSRF double-submit е belt-and-braces — работи и когато SameSite откаже, а е един допълнителен header на write операции. Defence in depth.

---

### 7.2 "Прекарай ме през refresh-rotation flow-а."

**Кратък отговор.** 1) MFE прави API вик. 2) Сървърът връща 401 (access token е изтекъл). 3) Axios response interceptor dispatch-ва `window.dispatchEvent(new CustomEvent("amp:auth-expired"))`. 4) Shell слуша event-а, вика `POST /api/auth/refresh` с CSRF header-а. 5) Сървърът верифицира refresh cookie, генерира нов access + нов refresh + нов CSRF, маркира стария refresh token като използван, сетва новите бисквитки. 6) Shell обновява `window.__AMP_PLATFORM__.csrfToken`. 7) Оригиналната failed заявка не се retry-ва автоматично в този POC — user-triggered действието ще иска retry, или следващият navigation tick ще успее.

**File reference.** `packages/platform-shell/src/auth/AuthContext.tsx:86-103` (refresh логика), `packages/api/src/domains/auth/auth.repository.ts` (rotateRefreshToken, session family).

---

### 7.3 "Какво е refresh-token reuse detection?"

**Кратък отговор.** Всеки refresh token има `familyId`, свързващ го с оригиналния login. Когато refresh token се *използва*, маркира се като consumed и се подменя с нов. Ако *същият* refresh token бъде представен пак (или атакуващ, който е откраднал cookie, или легитимно-но-състезателно retry), сървърът засича reuse-а и убива цялата family — всички токени от този login са отзовани, налагайки re-authentication навсякъде.

**Защо.** Откраднатите refresh токени са най-лошият session compromise, защото са дългосрочни. Reuse detection-ът ограничава blast radius: атакуващият и легитимният user не могат да са активни едновременно; първият reuse тригерира алармата.

**Уговорка.** Легитимни конкурентни refresh-и могат да тригерират false positives (два таба refresh-ват в същия момент). Митигираме с in-flight refresh ref в `AuthContext` — `refreshInFlight` мемоизира refresh promise-а, така че конкурентни expirations споделят един round trip.

---

### 7.4 "Защо не sliding sessions — просто удължавай access token-а на всяка заявка?"

**Кратък отговор.** Sliding sessions на *всяка* заявка или (а) изискват cookie write на заявка (производителност), или (б) държат access token-а дългосрочен и му позволяват да бъде откраднат за дълго (сигурност). Refresh шаблонът разделя грижите: кратки access токени ограничават theft blast radius, дълги refresh токени избягват принуда за re-login, а rotation + reuse detection хващат редкия случай, когато refresh token все пак изтече.

---

### 7.5 "Какво става, ако самият refresh endpoint падне?"

**Кратък отговор.** `tryRefresh` в shell-а връща false; `AuthContext` изчиства сесията и `ProtectedRoute` wrapper-ът пренасочва към login. Нито един отворен таб не остава в zombie authenticated state. На практика бихме искали retry с backoff за преходни грешки — POC-ът е single-attempt.

---

### 7.6 "Timing атаки на login?"

**Кратък отговор.** Покрити. Ако email-ът е непознат, сървърът все пак изпълнява `argon2.verify(DUMMY_HASH, password)` и отхвърля резултата, така че response time-ът е неразличим от wrong-password-for-valid-email случая. Без това атакуващ може да enumerate-не валидни email-и, измервайки response latency.

**File reference.** `packages/api/src/domains/auth/auth.repository.ts` (verifyCredentials с DUMMY_HASH fallback).

---

### 7.7 "Rate limiting? 10/мин достатъчно ли е за login?"

**Кратък отговор.** 10 login опита/мин на IP, 30 refresh опита/мин на IP. Достатъчно за предотвратяване на тривиално credential stuffing от един IP, недостатъчно за разпределени атаки — това иска WAF или CAPTCHA. Rate limiter-ът е `express-rate-limit` in-memory, което означава, че се reset-ва на API рестарт и не споделя state през инстанции. Продукция би използвала Redis-backed rate limiting.

---

## 8. Автентикация — window SDK

### 8.1 "Защо `window.__AMP_PLATFORM__`? Не е ли това ужасна практика?"

**Кратък отговор.** Това е минималният viable контракт за 30-минутен talk. Shell-ът публикува getter-based обект, когато `AuthProvider` се монтира; MFE-тата го четат в axios interceptor-а. Алтернативи: (а) експозирай SDK-то през Module Federation (по-type-safe, повече ceremony), (б) import-map с виртуален модул (по-чисто, но изисква SystemJS или еквивалентно tooling). Window bag-ът е честен за това, което е: runtime plug point.

**По-задълбочено.** Getter-based обект означава, че всяко четене е прясно — shell re-rendering-ите не инвалидират SDK-то; MFE винаги получава текущата стойност. Това е съзнателен design избор за предотвратяване на stale closures.

**File reference.** `packages/platform-shell/src/auth/platformSdk.ts:14-21,23-39` (interface + installer); `api/index.ts` на всеки MFE дублира interface-а (съзнателно, zero build coupling).

---

### 8.2 "Защо дублираш `PlatformSdk` interface във всеки MFE вместо shared types пакет?"

**Кратък отговор.** Shared types пакет е build-time свързаност — целият смисъл на тази архитектура е да я избегнем. Дублирането е съзнателен данък върху контракта: ако Shell смени SDK формата, всеки MFE иска изричен update, а тази видимост е feature, не bug. Контрактът е малък (3 полета), така че цената на дублирането е ~10 LOC на MFE.

**По-задълбочено.** Можеш да верифицираш, че контрактите съвпадат с малък CI скрипт, който diff-ва interface дефинициите между пакетите — това хваща drift, без да създава build зависимост.

---

### 8.3 "Какво, ако MFE се зареди, преди shell-ът да инсталира SDK-то?"

**Кратък отговор.** Axios interceptor-ът чете `window.__AMP_PLATFORM__?.csrfToken ?? null`. Ако е null, заявката тръгва без CSRF — което сървърът ще отхвърли за state-changing викове. На практика това никога не се случва, защото `AuthProvider` инсталира SDK-то синхронно по време на `useEffect`, преди каквото и да е MFE widget да може да се монтира и fetch-не. В standalone mode MFE прави собствен demo login и сам инсталира SDK-то.

**File reference.** `packages/mfe-billing/src/main.tsx:18-29` (standalone demo-login path).

---

### 8.4 "Как logout се propagate-ва към всички табове?"

**Кратък отговор.** Logout вика `POST /api/auth/logout`, което отзовава refresh-token family server-side. Следващия път, когато който и да е таб направи API вик, получава 401, fire-ва `amp:auth-expired`, refresh опитът се проваля (family е мъртва) и `AuthContext` пренасочва към login. Не е мигновено през табове; ограничено е от `staleTime` + следващото user действие.

**Уговорка.** За мигновен cross-tab logout ще използваш `BroadcastChannel` — слушай за „logout" съобщение и force-очисти локалното състояние. Не го правим, защото е инкрементална сложност за demo.

---

### 8.5 "Защо `amp:auth-expired` event използва `CustomEvent` на `window` вместо callback, регистриран при init?"

**Кратък отговор.** Zero coupling между Shell и MFE-та. Ако MFE-тата регистрираха callback, щяха да трябва да знаят *как* да го регистрират — т.е. кое shell API. Custom events на `window` са най-универсалният контракт: всякакъв JS навсякъде може да dispatch-не, всеки може да слуша. MFE не импортва нищо от shell-а; shell-ът не знае кои MFE-та съществуват.

---

## 9. Архитектура на API backend-а

### 9.1 "Защо API-то е един процес, разделен по domain папки, а не четири отделни сервиза?"

**Кратък отговор.** POC прагматика. *Формата* (router, schemas, repository на domain, zero cross-domain imports) е формата, която би използвал за microservices. Извличането в четири сервиза е deployment избор — организацията на кода вече е microservice-shaped. Един Express процес прави local dev, портове и CORS прости.

**File reference.** `packages/api/src/domains/{auth,billing,accounts,trading}/` — четири паралелни папки, всяка с `*.router.ts`, `*.schemas.ts`, `*.repository.ts`.

---

### 9.2 "Какво пречи на два domains случайно да споделят код?"

**Кратък отговор.** Конвенция + code review. Няма build-time enforcement. В продукция ще добавиш `eslint-plugin-boundaries` правило: „файлове в `domains/billing` не могат да импортват от `domains/trading`". За POC четирифолдерната паралелна структура е enforcement-ът — всеки cross-domain import стърчи визуално.

---

### 9.3 "Всеки repository е in-memory — как това оцелява продукция?"

**Кратък отговор.** Не оцелява. In-memory repositories са POC избор, така че рестартите са бързи, а state-ът е детерминистичен за демота. *Формата* — `XxxRepository` interface + конкретна `InMemoryXxxRepository` имплементация — е същата форма, която ще използваш за Postgres-backed `PgXxxRepository`. Slide 17 казва това изрично.

**File reference.** Всичките четири `*.repository.ts` файла — всеки експозира конкретен клас, inject-нат при router създаване.

---

### 9.4 "Как cross-domain `accountId` конвенцията се налага?"

**Кратък отговор.** Изобщо не се налага. Accounts, Billing и Trading всеки имат собствен поглед върху това какво `accountId` означава; единственият контракт е самият string. Cash ledger-ът на Trading lazy-инициализира 1 000 000 USD за всеки невиждан `accountId`; на Billing не му пука кои акаунти съществуват в Trading; и т.н. Реалните системи изглеждат така — `accountId` е join ключ през иначе независими domain stores.

**Уговорка.** В продукция ще добавиш referential integrity в краищата — напр. Trading верифицира, че акаунтът съществува през Accounts API, преди да приеме първия trade. POC-ът пропуска това, за да държи happy path-а кратък.

---

### 9.5 "Къде се случва auth верификацията в backend-а?"

**Кратък отговор.** `requireAuth` middleware в `packages/api/src/index.ts:36-40` — работи на `/api/billing`, `/api/accounts`, `/api/trading`. Look-up-ва `amp_access_token` в sessions map-а, закача user-а на `req` и вика `next()` или връща 401. `requireCsrf` работи на същите routes за non-idempotent методи, сравнявайки header срещу cookie.

---

### 9.6 "Каква е версията на Express — и защо не Fastify или Hono?"

**Кратък отговор.** Express 4, защото екосистемата е най-широка и аудиторията го знае. Fastify е по-бърз и по-модерен; Hono е новото горещо за edge runtimes. За POC изборът няма значение — domain-split шаблонът работи на всяка HTTP framework. Layer-ът за смяна е тривиално малък.

---

## 10. Swagger и генериране на типове

### 10.1 "Какъв е flow-ът от Swagger до TypeScript?"

**Кратък отговор.** 1) `packages/api/src/swagger.ts` — ръчно написан OpenAPI документ (source of truth). 2) `generateSwagger.ts` го dump-ва в `swagger.json`. 3) `swagger-typescript-api` чете JSON-а и генерира `src/api/generated/` във всеки consumer пакет (shell, billing, accounts, trading). 4) Всеки consumer импортва типове от *собствената* си generated папка — никаква cross-package type dependency.

**File reference.** `packages/api/src/swagger.ts`, `packages/api/src/generateSwagger.ts`; генерираните папки живеят в всеки frontend пакет.

---

### 10.2 "Защо четири копия на генерирани типове вместо един споделен `@amp/types`?"

**Кратък отговор.** Пак build-time свързаност. Споделен `@amp/types` означава, че всяка schema промяна форсира rebuild на всеки consumer в lockstep. Per-package регенерация означава, че всеки екип upgrade-ва независимо — можеш да имаш Billing на v2 на контракта и Trading все още на v1, стига HTTP контрактът да е backward-compatible. Цената е четири идентични копия на диск; ползата е независима deployability.

---

### 10.3 "Какво, ако API добави breaking change?"

**Кратък отговор.** Изпълни `npm run generate:types` от root-а — регенерира всичките четири. Consumer-ите, чиито код докосва променения endpoint, ще получат TypeScript грешки; останалите build-ват и deploy-ват нормално. В продукция ще run-неш type generation в CI срещу прясно-build-нат API, после ще run-неш typecheck на всеки MFE и ще fail-неш build-а при несъответствие.

**Уговорка.** Не версионираме Swagger документа. Правилен rollout ще публикува v1 и v2 паралелно, ще остави всеки MFE да мигрира, после ще retire-не v1. Това е infra, не код.

---

### 10.4 "Защо hand-write OpenAPI вместо генериране от Zod или декоратори?"

**Кратък отговор.** Zod schemas живеят в `*.schemas.ts` на всеки domain. Swagger документът дублира формите ръчно — което е излишно и може да drift-не. По-чиста версия ще генерира OpenAPI от Zod (`zod-to-openapi`). Не го направихме, защото POC Swagger-ът е малък, а аудиторията иска да види *един* source-of-truth файл, не да гони генератори. Шаблонът е същият и в двата случая.

---

### 10.5 "Генерираните файлове имат `@ts-nocheck` отгоре. Не е ли това лош знак?"

**Кратък отговор.** `swagger-typescript-api` emit-ва това по подразбиране, защото генераторите не могат да предвидят strictness настройките на всеки проект. Самите типове са здрави; `@ts-nocheck` просто байпасва local strictness, за да избегне generator-produced шум. Consumer-ите wrap-ват генерираните типове в собствен тесен `api/index.ts`, който *е* type-checked, така че `@ts-nocheck` никога не излиза навън.

---

## 11. CSS изолация и theming

### 11.1 "Защо inline CSS през `vite-plugin-css-injected-by-js`?"

**Кратък отговор.** Vite Module Federation плъгинът не зарежда remote CSS файлове — само JS chunks. Без inline-ване federated widget би се монтирал без стилове. Плъгинът bundle-ва CSS в JS-а и инжектира `<style>` тагове в runtime. Цена: по-голям JS, некеширан CSS. Полза: един load path, един failure mode.

**File reference.** Всичките три MFE `vite.config.ts` файла импортват плъгина.

---

### 11.2 "Какво за CSS bundle size? Не е ли разхитително shipping на CSS вътре в JS?"

**Кратък отговор.** Да, малко. За всеки MFE е максимум десетки KB — приемливо за платформа с няколко remote-а, не чудесно, ако имаш 20. Производствени workaround-и: extract CSS на remote, inject `<link rel=stylesheet>` от federation runtime-а; или ship малък CSS runtime, който fetch-ва sheet-а при първи widget mount. POC не се занимава, защото цената е минимална.

---

### 11.3 "Как предотвратяваш CSS от един MFE да изтече в друг?"

**Кратък отговор.** Три слоя: (1) CSS Modules scope-ва class имена (`.BillingPage__title___abc123`). (2) Всеки MFE page/widget root използва `isolation: isolate` за създаване на stacking context — z-index-и не излизат. (3) Design токени идват от shell-level CSS custom properties (`--text-muted`, `--border`), така че theming-ът е централизиран.

**Уговорка.** Глобални стилове (body font, html resets) живеят в shell-а и cascade-ват в MFE-тата. Ако MFE re-декларира глобален стил, last-one-wins — load order има значение.

---

### 11.4 "Какво за modal от MFE, който трябва да overlay-не цялата страница?"

**Кратък отговор.** Portal-и към `document.body` работят нормално — `isolation: isolate` засяга stacking context-а само *вътре* в root-а на MFE. Portal излиза от root-а и рендерира на body ниво, със собствен z-index stack. За modals, toasts, tooltips, това е правилният шаблон.

---

### 11.5 "Има ли споделена design система?"

**Кратък отговор.** Не. Design токените са дублирани в CSS на всеки MFE като custom properties. Това е expressly tradeoff — shared UI пакет ще свърже всеки екип с design-system release cadence-а. „Правилната" следваща стъпка, ако екипите растат, е `@company/tokens` пакет, съдържащ само CSS променливи (без компоненти) — ниска свързаност, лесно за adoption.

**По-задълбочено.** Чисто-токен пакетите са компромис: координират визуалния език без да свързват на component API-та. Пълни design-system пакети (buttons, modals и т.н.) са това, което добавяш в година 2, щом екипите са комфортни с version dance-а.

---

## 12. Обработка на грешки

### 12.1 "Какви грешки `MfeBoundary` реално хваща?"

**Кратък отговор.** Render-time грешки: remote не се зарежда, експозиран компонент хвърля по време на render, child компонент хвърля синхронно. НЕ хваща: грешки в event handlers, async грешки след mount (необхванати promises), грешки по време на state-updater callbacks. За тях `react-error-boundary` + `window.onunhandledrejection` е production шаблонът.

---

### 12.2 "Какво става, ако API-то е напълно недостъпно?"

**Кратък отговор.** Bootstrap вика на `AuthProvider` (`GET /api/auth/me`) се проваля, `tryRefresh` се проваля, user приземява на login страницата. Всеки следващ login опит се проваля с network грешка. Shell-ът остава функционален, но празен. UI-ът не се преструва, че е logged in — няма zombie state.

---

### 12.3 "Има ли observability? Logging? Tracing?"

**Кратък отговор.** Не, в този POC. Продукция ще иска structured logs на API (един log на заявка с domain, user, latency), Real User Monitoring на shell-а (грешки, MFE load failures, time-to-interactive на remote), и distributed tracing, ако разделиш API-то на microservices. Добавянето на observability е първата production задача — slide 17 го подразбира.

---

### 12.4 "Как дебъгваш cross-MFE бъг — данни от Billing изглеждат грешно на Dashboard?"

**Кратък отговор.** React Query DevTools (видими в dev) показват всяка query, нейното състояние и timestamp-и. Понеже queries използват key factory (`billingKeys`), можеш да tracе-неш кой MFE притежава коя query. Източниците на „грешни" данни обикновено се свеждат до: mutation не е invalidate-нала правилния key, или две MFE-та имат разминати копия на генерирани типове. И двете са малки фикса, щом си ги виждал.

---

### 12.5 "Какво, ако remote deploy-не breaking change по средата на сесия?"

**Кратък отговор.** Старите chunks продължават да работят (immutable content-hashed URLs). `remoteEntry.js` е short-TTL, така че следващото page зареждане взима новия manifest. Ако сигнатурата на експозиран модул от shell-а се е променила, TS декларацията във `vite-env.d.ts` я хваща в build time — не в runtime. Runtime несъвместимости между shell и remote са възможни, но редки на практика.

---

## 13. Developer experience

### 13.1 "Как работят трите dev mode-a?"

**Кратък отговор.** (1) **Full stack (`npm run dev` от root):** регенерира типове, build-ва и двата MFE remote-а (необходимо, защото Module Federation изисква `remoteEntry.js` да съществува), после пуска API + двете MFE preview-та + shell dev. (2) **Standalone MFE (`dev:billing:standalone`):** чист Vite dev с HMR, wrap-нат в собствен `QueryClientProvider`, прави demo login, така че страницата работи без shell-а. (3) **Built preview (`dev:billing`):** Vite preview, сервиращ build-натия bundle, така че federation работи, но HMR не — това е mode-ът, който shell-ът консумира.

**File reference.** Root `package.json` scripts; `packages/mfe-billing/src/main.tsx:18-29` (standalone demo-login).

---

### 13.2 "Защо shell-ът не може просто да импортва MFE-та през Vite dev с HMR?"

**Кратък отговор.** Vite federation плъгинът има нужда от built `remoteEntry.js` за да резолва remote модули. В dev mode Vite сервира индивидуални модули през ESM; federation runtime model-ът не съвпада. Workaround: MFE-тата използват `vite preview` (сервира pre-built bundle), докато shell-ът използва `vite dev` — shell-ът получава HMR, MFE-тата — не. Екипите итерират върху MFE в standalone mode (HMR работи), после тестват композиран mode срещу built bundle.

---

### 13.3 "Как тестваш промяна на widget, който е консумиран от shell-а?"

**Кратък отговор.** Standalone mode е бързият loop. Итерирай в `dev:billing:standalone` с HMR, потвърди, че widget-ът работи, после вдигни full stack за проверка на композицията. За автоматизирано тестване, MFE-level тестове (Jest + Testing Library) покриват widget-а в изолация; shell-level тестове (с mock-нати remotes) покриват интеграцията. POC-ът не доставя frontend тестове по design (CLAUDE.md: „No frontend tests. API tests exist; UI testing would be added by the consuming team").

---

### 13.4 "Как изглежда CI — как знаеш, че remote няма да счупи shell-а?"

**Кратък отговор.** POC-ът няма wired CI. Производствен шаблон: (1) всеки MFE има собствен CI — build, test, deploy. (2) Shell има smoke test, който се вдига срещу най-новите MFE builds и потвърждава, че всеки експозиран модул се зарежда. (3) Когато remote deploy-не, shell smoke тестът работи срещу новия remote; fail блокира deploy-а. TS ambient декларации във `vite-env.d.ts` хващат сигнатурни drift-ове в build time.

---

### 13.5 "Може ли това да върви на LAN за demo с два лаптопа?"

**Кратък отговор.** Да — сложи `PUBLIC_HOST=<LAN IP>` в root `.env` и `npm run dev`. `vite.config.ts` на shell-а чете `PUBLIC_HOST` в config time и композира remote URL-ите от него. Всеки Vite server bind-ва `host: true`. API proxy таргетите остават `localhost:3000`, защото proxy-то работи на dev машината, не в браузъра.

**File reference.** Секцията „LAN demo mode" в `CLAUDE.md`.

---

## 14. Производителност и bundle size

### 14.1 "Колко струва Module Federation срещу monolith SPA в first-paint?"

**Кратък отговор.** По-бавно. Shell-ът доставя първо, после fetch-ва `remoteEntry.js` за всеки remote, от който има нужда, после chunks на всеки remote. На cold load плащаш 1 + N network round trips, където N е броят remote-ове на първия screen. Monolith SPAs доставят един bundle. Митигации: prefetch `remoteEntry.js` от `<head>` на shell-а, HTTP/2 multiplexing, lazy-load remotes само за route-ове, които имат нужда от тях.

---

### 14.2 "Code-split-ваш ли на MFE?"

**Кратък отговор.** Да, имплицитно — всеки MFE е собствен bundle, а shell-ът `lazy()`-зарежда remote модули. Това значи, че Billing bundle-ът се тегли само когато Billing widget се появи. Вътре в всеки MFE можеш да code-split-неш още (route-level) използвайки нормални Vite dynamic imports.

---

### 14.3 "React ли е споделен като една инстанция към всички remotes, така че да не го доставяме четири пъти?"

**Кратък отговор.** Да. `shared: ["react", "react-dom", "@tanstack/react-query"]` значи, че federation runtime-ът доставя едно копие, което всички remotes използват. Chunks, които remote build-ва, все още съдържат stub-ове (module декларации), но реалният код идва от shared scope-а. Нетен ефект: React се доставя веднъж.

---

### 14.4 "Какво за axios дублирането, за което говорихме?"

**Кратък отговор.** Всеки MFE bundle-ва собствен axios. ~10 KB gzipped на remote; при четири remotes това е ~40 KB дублиране. Достатъчно евтино за POC; в продукция може да добавиш axios в shared scope-а, ако HTTP клиент API-то се стабилизира.

---

### 14.5 "Трикове за preloading?"

**Кратък отговор.** Не в POC-а. Продукция: `<link rel="modulepreload">` за известни-hot remote chunks, `Link` headers за HTTP/2 push, `startTransition` на React, за да държи shell-а интерактивен, докато remotes hydrate-ват. Slide 17 признава, че това са production разширения, не POC.

---

## 15. Готовност за продукция

### 15.1 "Каква е разликата между този POC и продукция?"

**Кратък отговор.** POC-ът е *архитектурно* production-shaped (domain split, auth шаблони, error boundaries, refresh rotation), но му липсват operational слоеве: persistent databases, external IdP, CI/CD на MFE, observability, версиониране на `remoteEntry.js`, rate limiting със shared state, secrets management. Всяко от тях е отделна production задача — нито едно не променя архитектурата.

**File reference.** `CLAUDE.md` „What is deliberately NOT here" + `PRESENTATION.md` slide 17.

---

### 15.2 "Може ли да се пусне в продукция с in-memory state?"

**Кратък отговор.** Не. Всеки рестарт трие сесии, фактури, акаунти, позиции, cash. Продукция подменя всеки `InMemoryXxxRepository` с `PgXxxRepository` или подобен. Интерфейсът вече е там — промяната е изолирана към repository слоя.

---

### 15.3 "Auth слоят покрива ли основния production bar?"

**Кратък отговор.** В голяма степен да, за шаблоните. argon2id за пароли ✓. httpOnly бисквитки ✓. Refresh rotation с reuse detection ✓. CSRF double-submit ✓. Rate limiting ✓ (макар in-memory). Timing-attack митигация ✓. Какво липсва: external IdP (SSO, MFA, user provisioning), audit logging, persistent rate-limit store, email/SMS за 2FA, password reset flow, account lockout, secure session store.

---

### 15.4 "Какво би променил, за да стане multi-region?"

**Кратък отговор.** Три неща: (1) session store-ът мести от in-memory към Redis или durable store с regional replication. (2) `remoteEntry.js` URL-ите идват от region-aware manifest (shell в ЕС fetch-ва ЕС MFE-та). (3) API трафикът route-ва през GeoDNS към най-близкия регион. Архитектурният шаблон не се променя; ops слоят — да.

---

### 15.5 "Disaster сценарии: какъв е blast radius на лош Billing deploy?"

**Кратък отговор.** С Module Federation + error boundaries: Billing widget-ът на Dashboard рендерира грешка, всяка друга страница работи, потребителите все още могат да login-ват и да навигират. Това е точно което демонстрираме на живо (стъпка 6: убий billing процеса). Сравнение: monolith SPA с лоша Billing промяна корумпира целия bundle; Billing deploy-ът или успява за всички, или блокира всички.

---

### 15.6 "Как ролбак-ваме лош MFE deploy бързо?"

**Кратък отговор.** `remoteEntry.js` сочи към versioned chunk URL. Rollback = върни manifest-а към предишната версия. Промяна за десет секунди, без shell rebuild, без user-facing downtime.

---

## 16. Алтернативи и сравнения

### 16.1 "Iframe-ите биха дали перфектна изолация. Защо не iframe-и?"

**Кратък отговор.** Iframe-ите дават *прекалено* много изолация. Няма споделена React инстанция → всеки iframe е собствен SPA със собствен bundle (4x React, 4x Query, 4x всичко). Няма споделен cache → cross-MFE координацията е трудна. Няма споделен routing → deep links са ръчни. Няма споделена тема → CSS променливи не преминават iframe граници. Усещането за споделена повърхност на едно приложение изчезва. Iframes са правилни за враждебно съдържание (реклами, недоверени 3-rd parties), не за first-party екипи.

---

### 16.2 "Web Components?"

**Кратък отговор.** Добра изолация (Shadow DOM), framework-агностични — но губиш React екосистемата вътре в component граница. Споделеният state management става custom-element-to-custom-element messaging. Styling през shadow boundary е болезнен. Web Components блестят, когато трябва да ship-неш компонент към външни consumer-и, които може да използват която и да е framework. Вътрешни first-party екипи на React stack са по-добре обслужвани от Module Federation.

---

### 16.3 "Защо не Nx или Turborepo вместо това?"

**Кратък отговор.** Nx и Turborepo са *build* инструменти — дават ти monorepo task graphs, caching, affected-project detection. Не ти дават runtime композиция. Можеш да комбинираш Nx + Module Federation (Nx има официална поддръжка). За POC, фокусиран върху runtime шаблона, Nx добавя сложност без да учи core концепцията.

---

### 16.4 "Какво за import-maps (native browser feature)?"

**Кратък отговор.** Import-maps дават runtime module resolution без build-time federation плъгин — декларираш `{"react": "https://cdn.example.com/react@18.3.1.js"}` и всеки import на `react` резолва там. Плюсове: browser-native, без bundler магия. Минуси: browser поддръжката все още е неравна (макар подобряваща се), по-трудно да се прави shared scope negotiation, tooling-ът е незрял. Module Federation + Vite има по-добър DX днес; import-maps вероятно ще го заменят в 3–5 години.

---

### 16.5 "Ако използвахме CDN-hosted React за всички MFE вместо shared scope?"

**Кратък отговор.** Работи, с уговорки: всеки MFE трябва да се съгласи на точния CDN URL (координация), и губиш shared-scope version negotiation-а, което federation предоставя. Ако две MFE сочат към различни CDN версии на React, се връщаш към two-instances-break-hooks проблема. Shared-scope на Module Federation е строго по-гъвкав.

---

### 16.6 "Това изглежда като Next.js App Router с parallel routes. Същото ли е?"

**Кратък отговор.** Parallel routes са композиционен шаблон на едно Next.js приложение — все още един екип, едно repo, един deploy. Module Federation е *runtime* композиция през независимо-deployable apps. Усещането е подобно; deployment модела е фундаментално различен. Ако не се нуждаеш от независими deploys, Next.js parallel routes са по-прости.

---

## 17. Организационни въпроси

### 17.1 "Кой притежава shell-а?"

**Кратък отговор.** Platform Core team. Те притежават auth, routing, тема, Dashboard surface и governance на контрактите. Те са bottleneck by design — всеки екип пуска в композираната повърхност на shell-а, така че shell екипът има veto власт върху промени на контрактите. Tradeoff-ът е, че shell екипът трябва да е отзивчив; бавен shell екип блокира всички.

---

### 17.2 "Каква е release cadence-а? Координират ли се екипите за release-и?"

**Кратък отговор.** Без координация за независими фичи. Billing deploys billing, Trading deploys trading, shell deploys shell — всеки е отделен pipeline. Координация е нужна само когато контрактът се променя (нов експозиран модул, променена сигнатура, споделена библиотека bump). Процес: RFC-style предложение, consumer sign-off, stage rollout.

---

### 17.3 "Колко голям трябва да е shell екипът?"

**Кратък отговор.** Малък. Shell-ът е съзнателно тънък — nav, auth, routing, Dashboard. Business логиката живее в MFE-та. Platform екип от 2–4 инженера е достатъчен за 4–6 MFE екипа. Ако shell-ът расте, това е сигнал, че shell-ът натрупва business логика, която принадлежи в MFE.

---

### 17.4 "Как обработваме споделени user flows, които обхващат MFE-та (напр. 'open account → fund → first trade')?"

**Кратък отговор.** Две опции: (а) orchestration в shell-а — shell-ът дефинира flow-а, embed-ва widget на MFE за стъпка. (б) Едно MFE притежава flow-а и embed-ва други през slots. (а) е предпочитан, защото flow-ът е cross-cutting concern. Shell-ът добавя една страница на flow; всяко MFE остава фокусирано на widget-level примитиви.

---

### 17.5 "Какво се случва, когато два екипа не са съгласни относно контракта?"

**Кратък отговор.** Shell екипът арбитрира. Тяхната роля е да държи контрактите минимални и consumer-friendly. На практика повечето спорове идват от „искаме втори prop на експозиран компонент" — обикновено решимо с по-богато slot API, а не с по-широк контракт.

---

### 17.6 "Как onboard-ваш нов екип/MFE?"

**Кратък отговор.** (1) Копирай съществуващ MFE skeleton, преименувай. (2) Регистрирай името + порта му в `vite.config.ts` remotes на shell-а. (3) Добави TS ambient декларация във `vite-env.d.ts` за всеки експозиран модул. (4) Реши къде новият widget композира — Dashboard, нова страница, slot. (5) Добави нова domain папка в API, ако MFE има backend нужди. Onboarding-ът е ~половин ден, не седмица.

---

### 17.7 "Има ли standards документ за нови екипи?"

**Кратък отговор.** В POC-а, `CLAUDE.md` + `ARCHITECTURE.md` са това. Продукция: platform-team-owned docs сайт с contract templates, example widgets и „how to add a new MFE" runbook-и. Документацията е толкова важна, колкото и tooling-ът — шаблоните гният без документация.

---

## 18. Мащабиране на шаблона

### 18.1 "Работи ли това за 10 екипа? 20?"

**Кратък отговор.** Да, с повече tooling. При 4 екипа shell-ът може да насмогва ръчно; при 10+ ще ти трябва plugin registry (екипите регистрират metadata на своя MFE — кои widgets, кои routes, кои permissions — през статичен файл, който shell-ът чете), RFC процес за contract промени и посветен platform екип. Шаблонът издържа; процесът става по-тежък.

---

### 18.2 "Какво, ако един MFE се нуждае от 50 widget-а? Разделяме ли го?"

**Кратък отговор.** Когато собствената кодова база на MFE удари същия 3-екипен праг, описан в началото, раздели по team линии. Trading MFE, който расте да покрие equities, derivatives и FX, е код за три екипа — време е да станат три MFE (`mfe-trading-equities`, `mfe-trading-derivatives`, `mfe-trading-fx`) с Trading domain lead, който притежава споделените Trading контракти. Рекурсивно прилагане на същото правило.

---

### 18.3 "Колко remote-а може shell-ът да зареди, преди производителността да се разпадне?"

**Кратък отговор.** Зависи какво е на първия screen. Ако Dashboard се нуждае от widgets от 4 MFE, това са 4 `remoteEntry.js` fetch + 4 chunk fetch. HTTP/2 се справя добре. При 10+ на един screen ще видиш кумулативна latency; фиксът е да не слагаш 10 remotes на един screen — lazy-load ги по route, tab или user действие.

---

### 18.4 "Cross-MFE permissions — как Billing widget на Dashboard знае user role-а?"

**Кратък отговор.** `window.__AMP_PLATFORM__.user.role`. SDK-то експозира текущия user; всеки MFE решава какво да прави с него. На практика role проверките живеят и на backend-а (всеки API endpoint верифицира auth + authorisation), така че UI проверката е просто rendering удобство. User без billing достъп вижда празен widget; API-то така или иначе не би му сервирало данни.

---

### 18.5 "Как налагаме, че само авторизирани MFE-та могат да бъдат заредени?"

**Кратък отговор.** На shell ниво. Shell-ът регистрира само remote-овете, които познава; няма да `lazy()`-зарежда произволни URL-ти. Атакуващ, контролиращ remote URL, може да сервира каквото и да е — така че `remoteEntry.js` URL-ите трябва да идват от доверена инфраструктура (CDN, който контролираш, signed manifest при deploy). CSP (Content-Security-Policy) headers на shell-а ограничават откъде JS може да се зарежда; заключи това в продукция.

---

### 18.6 "Могат ли потребителите да персонализират кои MFE-та виждат?"

**Кратък отговор.** Да, на shell ниво. Routing-ът на shell-а и Dashboard композицията са просто React — guard-вай по role, feature flag, user preference. Всеки user може да вижда различен Dashboard; MFE remote-овете, които се зареждат, са функция на това какво се рендерира. Тук шаблонът блести: композиционната повърхност *е* повърхността за персонализация.

---

## Приложение A — „Покажи ми кода" cheat sheet

Speaker cheat sheet за live follow-ups. Всеки pointer е на едно натискане в демото.

| Тема | Файл + ред |
|---|---|
| Federation remotes на shell-а | `packages/platform-shell/vite.config.ts:24-32` |
| MFE exposes (пример: Trading) | `packages/mfe-trading/vite.config.ts:10-18` |
| TS ambient декларации за federated imports | `packages/platform-shell/src/vite-env.d.ts` |
| `QueryClient` на shell-а | `packages/platform-shell/src/main.tsx` |
| Cross-MFE cache invalidation (pay invoice) | `packages/mfe-billing/src/components/InvoicesTable.tsx:23-28` |
| Slot composition — slot prop | `packages/mfe-open-account/src/pages/OpenAccountPage.tsx:8-62` |
| Slot composition — запълнител | `packages/platform-shell/src/App.tsx:38-54` |
| Error boundary | `packages/platform-shell/src/components/MfeBoundary.tsx:17-44` |
| Auth state machine | `packages/platform-shell/src/auth/AuthContext.tsx:41-163` |
| Window SDK install | `packages/platform-shell/src/auth/platformSdk.ts:14-39` |
| MFE axios interceptor (CSRF echo) | `packages/mfe-billing/src/api/index.ts:28-60` |
| Auth router (login, refresh, logout) | `packages/api/src/domains/auth/auth.router.ts:35-98` |
| Refresh rotation + reuse detection | `packages/api/src/domains/auth/auth.repository.ts` (`rotateRefreshToken`) |
| Trading cash ledger | `packages/api/src/domains/trading/trading.repository.ts` (`cashLedger`) |
| Swagger source of truth | `packages/api/src/swagger.ts` |
| Swagger → per-package generation | `packages/api/src/generateSwagger.ts` + root `package.json` `generate:types` |
| `vite-plugin-css-injected-by-js` | `vite.config.ts:4` на всеки MFE |
| `isolation: isolate` пример | `packages/mfe-billing/src/pages/BillingPage.module.css` |

---

## Приложение B — „Какво не бива да казваш на сцена"

Въпроси, които изкушават твърде самоуверен отговор. Дръж ги честни.

- **"Готово ли е за продукция?"** → „*Шаблоните* са production-shaped. *Имплементацията* е POC — in-memory stores, hard-coded URL-и, без observability. Всяко от тях е добре разбрана production задача; нито едно не променя архитектурата."
- **"Какви са минусите?"** → „Координационен overhead за споделените singleton-и (React, Query), runtime композиционната цена на first paint и shell екипът е единствената точка за contract governance. Това са реални, не хипотетични."
- **"Ти би ли го използвал в компанията си?"** → „Бих, ако имах 3+ екипа с независими release cadence-и на един продукт. Под този праг добре модуларизиран монолит печели всеки път."
- **"Какво, ако нашият екип е React-срамежлив?"** → „Шаблонът е React-независим — single-spa работи с всяка framework смес. Но специфичните ползи, които демонстрирахме (споделен Query cache, споделен context, споделен router), зависят от една framework. Смесените frameworks струват повече, отколкото спестяват."
- **"Защо избра POC вместо документирани примери?"** → „Защото документираните примери крият tradeoff-ите. Да стартираш нещото означава, че всяко носещо решение има цена, която трябваше да изядем — което е точно това, което аудиторията трябва да види, преди да копира шаблона."

---

*Документът е подготвен от пълен анализ на `PRESENTATION.md`, `ARCHITECTURE.md`, `DEMO_SCRIPT.md`, `AUTH_FLOW.md` и source дървото под `packages/`. Всяко твърдение в този документ е носещо върху конкретен файл или секция от тези входове.*
