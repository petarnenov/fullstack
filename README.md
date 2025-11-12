# Fullstack Monorepo - Proof of Concept

Monorepo project with React 19 frontend and Express backend with **automatic TypeScript generation from Swagger**.

## 🚀 Quick Start

The project is **already running**:

- **Frontend**: <http://localhost:5173>
- **Backend**: <http://localhost:3000>
- **Swagger UI**: <http://localhost:3000/api-docs>

### Starting the Project

```bash
npm run dev  # Generates types and starts backend + frontend
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

## 🎯 Features

### Landing Page with 3 Tabs

1. **👥 Users** - CRUD operations
2. **📦 Products** - Product management
3. **🛒 Orders** - Order system

## 💻 Technologies

### Frontend

- React 19.2.0
- Vite 6
- React Compiler 1.0.0
- React Router 7
- TanStack Query (React Query)
- Zod
- TypeScript

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

## Structure

```
fullstack/
├── packages/
│   ├── backend/     # Express API server
│   └── frontend/    # React application
└── package.json     # Root workspace configuration
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

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Run tests in watch mode
```

## Generate Types from Swagger

```bash
npm run generate:types
```

This automatically generates TypeScript types from Swagger definitions and shares them between frontend and backend.
