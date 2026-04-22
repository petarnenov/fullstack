# bff-reporting — data flow & auth model

Техническа справка за единствения BFF в репото. Допълва архитектурния overview в `/ARCHITECTURE.md` (§ Backend topology) и load-bearing constraint #8 в `/CLAUDE.md`.

## Участниците

```
browser  ──►  shell :5173 (vite proxy)  ──►  bff-reporting :8090 (Spring Boot)  ──►  api-java :8088 (Tomcat monolith)
```

Всяка стрелка е HTTP. Нищо не се споделя по памет — всичко е wire-level.

## Какво точно е BFF-ът

`packages/bff-reporting` е **отделен JVM процес**, Spring Boot 3.4 fat jar (`amp-bff-reporting.jar`). Не е web компонент в монолитния Tomcat — има собствен embedded Tomcat, собствен class loader, собствена heap. Стартира се с `java -jar` на порт 8090.

Четири слоя в `src/main/java/com/amp/bff/reporting/`:

| Слой | Клас | Задача |
|---|---|---|
| `api/` | `ReportsController` | HTTP endpoint, `@RestController`, връща `Mono<List<AccountReport>>` сериализиран като JSON |
| `service/` | `ReportAggregator` | orchestration — кой кого пита, в какъв ред, как се reshape-ва |
| `client/` | `MonolithClient` | изходящ HTTP клиент към монолита, Reactor `WebClient` |
| `model/` | `AccountReport`, `MonolithTypes` | DTO-та: един BFF-owned + partial records за монолитни отговори |
| `api/` | `WebClientErrorAdvice` | `@RestControllerAdvice` — preserve-ва upstream status codes |

## Data flow: от клик в браузъра до render

### 1. Browser изпраща заявка

MFE-то (`packages/mfe-reporting/src/api/index.ts`) има axios instance с:

```ts
const http = axios.create({ baseURL: "/api/reporting" });
```

`reportingApi.summary()` извиква `http.get("/summary")` → браузърът вижда `http://localhost:5173/api/reporting/summary`.

Request interceptor-ът добавя `Authorization: Bearer <token>` от `window.__AMP_PLATFORM__.getToken()` (runtime auth contract, собственост на shell-а — виж constraint #6).

### 2. Shell vite proxy разпределя

В `packages/platform-shell/vite.config.ts`:

```ts
"/api/reporting": { target: "http://localhost:8090" },  // BFF
"/api":           { target: "http://localhost:8088" },  // monolith
```

Vite прави **longest-prefix match** — URL-ът започва с `/api/reporting`, така че отива към :8090. Path `/api/billing/invoices` би match-нал втория ред и би отишъл към :8088.

Това е **fence-ът**: MFE-то физически не може да стигне до монолита, дори да сбърка path-а. Axios baseURL-ът е закован на `/api/reporting`, така че всеки request започва с този prefix.

### 3. BFF приема заявката

Spring Boot dispatcher пуска `ReportsController.summary()`:

```java
@GetMapping("/summary")
public Mono<List<AccountReport>> summary(
    @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String authHeader
) {
    return aggregator.summarise(authHeader);
}
```

Ключови неща:

- `@RequestHeader AUTHORIZATION` — токенът от браузъра се взима като стойност. BFF-ът **не го валидира**. Не парсва JWT, не сравнява с H2, не пита auth service — само го подава нататък.
- `Mono<List<AccountReport>>` — reactive тип. Spring Boot автоматично subscribe-ва, изчаква Mono-то да се resolve-не и сериализира резултата като JSON.

### 4. Aggregator-ът организира fan-out

В `ReportAggregator.summarise()`:

```java
Mono<List<Account>> accounts = monolith.listAccounts(authHeader);
Mono<List<Invoice>> invoices = monolith.listInvoices(authHeader);

return Mono.zip(accounts, invoices)                        // ◄── стъпка A: паралелно
    .flatMap(tuple -> {
        List<Account> acc = tuple.getT1();
        Map<String, List<Invoice>> invoicesByAccount = tuple.getT2()
            .stream().collect(Collectors.groupingBy(Invoice::accountId));

        return Flux.fromIterable(acc)
            .flatMap(a -> monolith.getPortfolio(a.id(), authHeader)   // ◄── стъпка B: паралелно
                .onErrorReturn(emptyPortfolio(a.id()))
                .map(p -> buildReport(a, invoicesByAccount.getOrDefault(a.id(), List.of()), p)))
            .collectList();
    });
```

Преведено:

**Стъпка A (паралелно):** `Mono.zip(accounts, invoices)` стартира двете заявки към монолита едновременно. `WebClient` е non-blocking (Reactor Netty под капака), така че двете HTTP connections се държат паралелно от един thread. Изчаква докато *и двете* приключат, после tuple-ва резултатите.

**Стъпка B (паралелно):** за всеки account от списъка, `flatMap` (не `concatMap` — разликата е важна) стартира `monolith.getPortfolio(accountId, ...)`. `flatMap` в Reactor по подразбиране е paralleл — пуска N заявки едновременно, не чака една да приключи преди следващата. С 4 seeded акаунта → 4 едновременни HTTP заявки.

**Reshape:** `buildReport(account, invoices, portfolio)` съшива трите източника в един `AccountReport` — филтрира paid invoices, брои overdue, взима top holding от портфолиото.

**Total round trips към монолита:** 2 (паралелно) + N (паралелно) = **wall-clock time ≈ 2 последователни HTTP hops**, независимо колко акаунта има.

Сравнение с "без BFF":

| Подход | Round trips от браузъра | Wall clock |
|---|---|---|
| MFE → монолит директно | `2 + N` (всеки пресича internet/shell) | `~(2+N) × RTT_browser` |
| MFE → BFF → монолит | `1` | `~2 × RTT_localhost + RTT_browser` |

При 4 акаунта и типичен RTT, разликата е 6 заявки през browser network stack срещу 1.

### 5. Изходящи заявки през `MonolithClient`

```java
return client.get()
    .uri("/api/accounts")
    .headers(h -> forwardAuth(h, authHeader))   // ◄── Bearer forward
    .retrieve()
    .bodyToMono(new ParameterizedTypeReference<List<Account>>() {});
```

`forwardAuth` прави `headers.set(AUTHORIZATION, authHeader)` без промени.

Монолитът (:8088) гледа тази заявка **идентично** с всяка друга. Нито `User-Agent`, нито някакво специално поле не отличава BFF-а от директна MFE заявка. От гледна точка на монолита, идва HTTP заявка с Bearer токен. Толкова.

### 6. Грешки и status codes

Какво става ако монолитът отговори 401?

`WebClient.retrieve()` хвърля `WebClientResponseException` за всеки 4xx/5xx. Без handling Spring Boot default-но го превръща в 500 — което би счупило auth flow-а на фронта, защото axios interceptor-ът чака **401** за да dispatch-не `amp:auth-expired`.

Затова `WebClientErrorAdvice.java`:

```java
@ExceptionHandler(WebClientResponseException.class)
public ResponseEntity<String> passThroughUpstreamStatus(WebClientResponseException ex) {
    return ResponseEntity.status(ex.getStatusCode())
        .body(ex.getResponseBodyAsString());
}
```

Каквото upstream-ът отговори → BFF отговаря същото. 401 → 401. 404 → 404. 500 → 500.

### 7. Връщане по веригата

```
monolith → BFF (WebClient receives) 
        → aggregator assembles AccountReport[]
        → ReportsController's Mono resolves
        → Spring Boot Jackson serialises to JSON
        → HTTP 200 response
        → vite proxy tunnels it back
        → browser receives
        → axios resolves
        → react-query caches under reportingKeys.summary()
        → React re-renders ReportingPage + ReportingSummaryWidget
```

## Auth модел: BFF-ът е pass-through, не authority

**Какво BFF-ът НЕ прави:**

- Не parse-ва токена.
- Не пита auth service за валидация.
- Не има своя база с users.
- Не решава "може ли този user да види reports?"

**Какво BFF-ът прави:**

- Взима `Authorization` header, какъвто и да е (или липсва изцяло).
- Подава го към монолита на всяка outbound заявка.
- Ако монолитът каже 401, BFF-ът връща 401.

**Защо така.** Ако BFF-ът валидираше токените, щеше да трябва:

- да споделя secret/keystore с монолита, или
- да го пита през отделен auth endpoint на всяка заявка, или
- да държи своя H2 с огледална таблица.

Всичко това дублира логика и въвежда нов failure mode (split-brain, ако двете auth-източника се разминат). В сегашния модел има **един auth authority** — монолитът — и BFF-ът е proxy, който казва "питай този за мнение".

Цялата сложност на auth flow-а работи непроменена:

```
user logs out in shell 
  → токенът се изтрива от localStorage 
  → при следваща MFE заявка interceptor-ът НЕ закача Authorization header 
  → BFF получава заявка без header 
  → forward-ва към монолита без header 
  → монолитът 401 
  → WebClientErrorAdvice ретърнва 401 към MFE 
  → MFE axios interceptor dispatch-ва amp:auth-expired 
  → shell listener прави force-logout + redirect към /login
```

## Контракти: два независими pipeline-а

| Consumer | Контракт идва от |
|---|---|
| `mfe-billing`, `mfe-accounts`, `mfe-trading`, `platform-shell` (auth) | `@amp/swagger` — hand-written OpenAPI, generates axios clients |
| `mfe-reporting` | `packages/mfe-reporting/openapi-bff.json` — snapshot от springdoc на BFF-а, generates TypeScript types |

BFF-ът **owns-ва собствения си контракт**. Springdoc авто-генерира OpenAPI от `@RestController` рефлекция при стартиране, експозва го на `/v3/api-docs`. `scripts/refresh-openapi.mjs` pull-ва spec-а и го save-ва като snapshot. `swagger-typescript-api` генерира TypeScript types от snapshot-а.

Защо reporting endpoint-ите не отиват в `@amp/swagger`? Защото `@amp/swagger` е контракт на **монолита**. Ако BFF-ът утре смени shape-а на `AccountReport` или добави нов rollup endpoint, това не е промяна на монолита. Per-team, per-backend контракт.

## Cache sharing: widget + page = една заявка

`ReportingSummaryWidget` (dashboard tile) прави:

```ts
useQuery({ queryKey: reportingKeys.summary(), queryFn: reportingApi.summary })
```

`ReportingPage` (пълна таблица) прави:

```ts
useQuery({ queryKey: reportingKeys.summary(), queryFn: reportingApi.summary })
```

Един и същ key factory (`["reporting", "summary"]`). React Query е federation-shared singleton (constraint #1) → два `useQuery` hook-а с еднакъв ключ → един shared cache entry → **една единствена network заявка** към BFF-а.

Flow при navigation:

1. Dashboard зарежда → widget fetch-ва → 1 заявка към BFF → cached.
2. User кликва "Go to Reports" → ReportingPage mount-ва → чете cached entry, не fetch-ва наново (до `staleTime: 30_000` от shell-овия `QueryClient`).
3. И двата surface-а показват същите данни, без ръчна синхронизация.

## Кога да добавиш нов BFF

Правило: **когато MFE-то иска cross-domain denormalised view**.

- Single-domain MFE (billing, accounts, trading) → говори с монолита директно през `@amp/swagger`. BFF би бил излишен proxy hop.
- Multi-domain aggregation view (reporting) → собствен BFF. Fan-out се случва server-side, по-близо до монолита (localhost hop, паралелно), DTO-то е shape-нато за конкретния UI.

Ако го правиш, копираш shape-а:

- нов `packages/bff-<team>` fat jar на нов порт,
- нова proxy линия в `platform-shell/vite.config.ts` **преди** catch-all-а на `/api`,
- нов MFE с locked axios baseURL `/api/<team>`,
- springdoc за auto-generated OpenAPI, snapshot в MFE-то за offline codegen.

BFF-овете са **per-team**. Никога BFF→BFF calls — това превръща BFF слоя в микросървисна мрежа, което е друг вид сложност и не е това, което този POC демонстрира.

## Quick reference: кои endpoint-и BFF-ът вика

| Monolith endpoint | Защо | Колко пъти на заявка |
|---|---|---|
| `GET /api/accounts` | списъка на всички акаунти | 1 |
| `GET /api/billing/invoices` | всички фактури, BFF-ът групира по `accountId` | 1 |
| `GET /api/trading/portfolio?accountId=…` | портфолио за конкретен акаунт | N (по 1 на акаунт, паралелно) |

Всичките носят forward-натия `Authorization` header. Ако някой падне (404, 500, timeout), `onErrorReturn(emptyPortfolio(...))` гарантира, че отделен fail не събаря целия report — конкретният ред просто се показва с нули.
