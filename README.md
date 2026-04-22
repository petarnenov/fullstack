# Asset Management Platform — Micro-Frontend POC

A proof-of-concept for a micro-frontend architecture modelled on a realistic asset-management platform. Four teams own four packages; Module Federation composes them at runtime.

| Team               | Package                | Port | Owns                                                     |
| ------------------ | ---------------------- | ---- | -------------------------------------------------------- |
| Platform Core      | `platform-shell`       | 5173 | Shell, nav, auth, Dashboard composition                  |
| Billing            | `mfe-billing`          | 5175 | Invoices, transactions, balance widget                   |
| Open Account       | `mfe-open-account`     | 5174 | Onboarding wizard, progress widget                       |
| Trading            | `mfe-trading`          | 5176 | Orders, positions, portfolio widget                      |
| _(shared service)_ | `api-java`             | 8088 | Tomcat WAR (Struts2 + Akka + Hibernate), 4 domains       |
| _(tooling)_        | `swagger`              | —    | Hand-maintained OpenAPI contract + codegen for all 4 FE  |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design and [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) for the 30-minute walkthrough.

## Quick start

```bash
npm install
# one-time: set TOMCAT_HOME in /.env (see .env.example) to a Tomcat 9 install
npm run dev
```

This regenerates TypeScript types from Swagger, builds the three MFE remotes, and starts all five dev processes:

- Platform shell — http://localhost:5173
- Billing MFE (built preview) — http://localhost:5175
- Open Account MFE (built preview) — http://localhost:5174
- Trading MFE (built preview) — http://localhost:5176
- Java backend (Tomcat) — http://localhost:8088

The shell's vite proxy sends every `/api/*` request to the Java tier on `:8088`.

## Running pieces individually

Each MFE works **standalone** on its own port (shows widget preview + full page), so teams can develop without the shell running:

```bash
npm run dev:billing:standalone   # vite dev on 5175
npm run dev:accounts:standalone  # vite dev on 5174
npm run dev:trading:standalone   # vite dev on 5176
```

When composed by the shell, each MFE is served as a **built preview** so `remoteEntry.js` is available:

```bash
npm run dev:billing    # vite preview on 5175
npm run dev:accounts   # vite preview on 5174
npm run dev:trading    # vite preview on 5176
npm run dev:shell      # vite dev on 5173 (host)
npm run dev:api-java   # launches Tomcat via packages/api-java/Makefile
```

The Java backend also has its own targets (run from `packages/api-java/`):

```bash
make build      # gradle war
make start      # deploy + catalina.sh run (foreground, :8088)
make dev        # deploy + fswatch rebuild loop (requires fswatch)
make debug      # jpda on :5005
make stop
```

## Regenerate API types

The API contract is hand-maintained in `packages/swagger/src/swagger.ts` — it is the source of truth that both the Java backend and the frontends must honour. All three MFEs and the shell have independent generated axios clients under `src/api/generated/`.

```bash
npm run generate:types
```

## Tests

No tests on this branch. The previous Jest suite lived in `@amp/api` and was dropped when the Node tier was retired in favour of `api-java`.
