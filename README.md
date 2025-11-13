# Fullstack Monorepo - Proof of Concept

Monorepo project with React 19 frontend and Express backend with **automatic TypeScript generation from Swagger**.

## 🚀 Quick Start

The project is **already running**:

- **Frontend**: <http://localhost:5173>
- **Backend**: <http://localhost:3000>
- **Swagger UI**: <http://localhost:3000/api-docs>
- **Micro Frontend**: <http://localhost:5174>

### Starting the Project

```bash
npm run dev  # Generates types, builds micro-frontend, and starts all servers
```

TypeScript types are generated **automatically** on every dev start from the Swagger specification.

### Manual Type Generation

```bash
npm run generate:types
```

For more information see [QUICKSTART.md](./QUICKSTART.md) and [TYPE_GENERATION.md](./TYPE_GENERATION.md)

## 📋 Documentation

### Getting Started
- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start instructions
- **[USAGE.md](./USAGE.md)** - Complete usage documentation
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Technical details

### Type Generation (⭐ Important)
- **[AUTO_TYPE_GENERATION.md](./AUTO_TYPE_GENERATION.md)** - Automatic generation on dev start
- **[TYPE_GENERATION.md](./TYPE_GENERATION.md)** - Complete type generation guide
- **[PROP_RENAME_GUIDE.md](./PROP_RENAME_GUIDE.md)** - 🔧 How to rename properties
- **[SWAGGER_INTEGRATION.md](./SWAGGER_INTEGRATION.md)** - Swagger integration

### Database & Architecture
- **[packages/backend/REPOSITORY_PATTERN.md](./packages/backend/REPOSITORY_PATTERN.md)** - Repository pattern documentation
- **[packages/backend/TEST_DATABASE.md](./packages/backend/TEST_DATABASE.md)** - Test database setup

### Micro Frontend
- **Micro Frontend Architecture** - Module Federation with runtime code sharing
- **Independent API** - Each frontend has own Swagger-generated API client
- **Shared QueryClient** - TanStack Query shared as singleton for cache synchronization
- **Independent Deployment** - Micro frontend can be deployed separately
- **Auto-sync Updates** - Orders created in micro-frontend appear instantly in host app
- **CSS Injection** - Styles automatically injected into JS bundles via vite-plugin-css-injected-by-js
- **Style Isolation** - Independent styling with CSS Modules and `isolation: isolate`
- **No CSS Files** - All styles inlined in JavaScript for seamless Module Federation

## 🎯 Features

### Landing Page with 5 Tabs

1. **👥 Users** - CRUD operations with data grid
2. **📦 Products** - Product management with forms
3. **🛒 Orders** - Order system with cache invalidation button
4. **🎯 Type Examples** - TypeScript utilities showcase
5. **🎨 Micro Frontend** - Module Federation demo with independent styling

### Key Features

- **🔄 Cache Invalidation** - Manual refresh button in Orders tab
- **🎨 CSS Modules** - Scoped styling in both host and micro-frontend
- **💉 CSS Injection** - Automatic CSS loading with Module Federation
- **🔒 Style Isolation** - Independent styles between host and micro-frontend
- **📊 Real-time Sync** - Orders created in micro-frontend appear instantly in host app
- **🚀 Auto Type Generation** - TypeScript types generated automatically from Swagger

## 💻 Technologies

### Frontend (Host App)

- React 19.2.0
- Vite 6
- React Compiler 1.0.0
- React Router 7
- TanStack Query (React Query)
- Zod
- TypeScript
- Module Federation (@originjs/vite-plugin-federation)
- **CSS Modules** - Scoped styling with camelCase classes

### Micro Frontend (Remote App)

- React 19.2.0
- Vite 6
- TypeScript
- TanStack Query 5.90.8 (shared singleton)
- Axios 1.13.2
- Module Federation (@originjs/vite-plugin-federation)
- **vite-plugin-css-injected-by-js** - CSS injection for Module Federation
- **CSS Modules** - Scoped styling with automatic injection
- Swagger-generated API client
- Shared React and QueryClient with host app
- **Style Isolation** - `isolation: isolate` for independent styling

### Backend

- Express
- Swagger/OpenAPI
- Zod
- TypeScript
- SQLite (better-sqlite3)
- Repository Pattern

## 🗄️ Database Options

The project supports three database configurations:

1. **In-Memory Arrays** (default) - `USE_SQLITE=false`
2. **SQLite File** - `USE_SQLITE=true`
3. **SQLite In-Memory Test** - `NODE_ENV=test`

See [REPOSITORY_PATTERN.md](./packages/backend/REPOSITORY_PATTERN.md) for details.

## 🎨 Styling Architecture

### CSS Modules
Both host and micro-frontend use **CSS Modules** for scoped styling:

- **Scoped Classes** - All classes are automatically scoped to prevent conflicts
- **camelCase Convention** - Class names use camelCase (e.g., `.headerWithActions`)
- **Type Safety** - Import styles as `import styles from "./App.module.css"`
- **Usage** - `className={styles.tabContent}`

### Micro Frontend CSS Injection

The micro-frontend uses **vite-plugin-css-injected-by-js** to solve CSS loading with Module Federation:

- **No Separate CSS Files** - All CSS is inlined into JavaScript bundles
- **Automatic Injection** - CSS is injected into `<head>` when module loads
- **Module Federation Compatible** - CSS travels with federated modules
- **Style Isolation** - Uses `isolation: isolate` to prevent style bleeding

**Why?** Vite's Module Federation plugin doesn't automatically load CSS files from remote modules. By inlining CSS into JS, styles are guaranteed to load when the micro-frontend is consumed by the host app.

### Style Isolation Techniques

1. **CSS Modules** - Automatic class name hashing (e.g., `._microPage_1843m_1`)
2. **isolation: isolate** - Creates new stacking context for independent rendering
3. **Explicit Colors** - All text colors explicitly defined to prevent inheritance
4. **Box Sizing** - `* { box-sizing: border-box }` in scoped containers

## Structure

```
fullstack/
├── packages/
│   ├── backend/        # Express API server
│   ├── frontend/       # React application (host)
│   └── micro-frontend/ # Micro frontend (remote)
└── package.json        # Root workspace configuration
```

## Installation

```bash
npm install
```

## Running the Project

### Development Mode
```bash
npm run dev
```

This will start simultaneously:
- Backend at http://localhost:3000
- Frontend at http://localhost:5173
- Micro Frontend at http://localhost:5174 (preview mode)
- Swagger UI at http://localhost:3000/api-docs

### Running Separately

Backend:
```bash
npm run dev:backend
```

Frontend:
```bash
npm run dev:frontend
```

Micro Frontend:
```bash
npm run dev:micro  # Runs in preview mode
```

### Building

Build all packages:
```bash
npm run build
```

Build specific package:
```bash
npm run build:backend
npm run build:frontend
npm run build:micro
```

**Build Output:**
- **Frontend**: ~293 KB (includes App.module.css)
- **Micro Frontend**: ~182 KB (CSS injected into `__federation_fn_import-*.js`)
- **No CSS Files in Micro Frontend**: All styles inlined in JS (~11.30 KB total)

## 🔄 Cache Management

### Manual Cache Invalidation

The Orders tab includes a **"🔄 Invalidate Cache"** button that:
- Manually refreshes orders data from the server
- Triggers `queryClient.invalidateQueries({ queryKey: ["orders"] })`
- Useful when you want to force-fetch latest data without page reload
- Syncs data across all consumers (host + micro-frontend)

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
```

## Generate Types from Swagger

```bash
npm run generate:types
```

This automatically generates TypeScript types from Swagger definitions for:
- **Frontend** (`packages/frontend/src/api/generated`)
- **Micro-frontend** (`packages/micro-frontend/src/api/generated`)

Both frontends have independent API clients with shared type definitions from the backend.
