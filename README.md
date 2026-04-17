# Asset Management Platform — Micro-Frontend POC

A proof-of-concept for a micro-frontend architecture modelled on a realistic asset-management platform. Four teams own four packages; Module Federation composes them at runtime.

| Team               | Package                | Port | Owns                                    |
| ------------------ | ---------------------- | ---- | --------------------------------------- |
| Platform Core      | `platform-shell`       | 5173 | Shell, nav, auth, Dashboard composition |
| Billing            | `mfe-billing`          | 5175 | Invoices, transactions, balance widget  |
| Open Account       | `mfe-open-account`     | 5174 | Onboarding wizard, progress widget      |
| Trading            | `mfe-trading`          | 5176 | Orders, positions, portfolio widget     |
| _(shared service)_ | `api`                  | 3000 | Domain-split Express API (4 domains)    |

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full design and [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md) for the 30-minute walkthrough.

## Quick start

```bash
npm install
npm run dev
```

This regenerates TypeScript types from Swagger, builds the three MFE remotes, and starts all five processes:

- Platform shell — http://localhost:5173
- Billing MFE (standalone preview) — http://localhost:5175
- Open Account MFE (standalone preview) — http://localhost:5174
- Trading MFE (standalone preview) — http://localhost:5176
- API + Swagger UI — http://localhost:3000 / http://localhost:3000/api-docs

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
npm run dev:api        # tsx watch
```

## Tests

```bash
npm test   # Jest (API domain repositories)
```

## Regenerate API types

The API owns the Swagger source of truth (`packages/api/src/swagger.ts`). All three MFEs and the shell have independent generated clients under `src/api/generated/`.

```bash
npm run generate:types
```
