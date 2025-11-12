# Type Generation Guide

## Overview

This project uses **swagger-typescript-api** to automatically generate TypeScript types and API client from the OpenAPI/Swagger specification.

## Generated Files

The type generation creates the following files in `packages/frontend/src/api/generated/`:

- **data-contracts.ts** - TypeScript interfaces for all API models (User, Product, Order, etc.)
- **Api.ts** - Type-safe API client class with methods for all endpoints
- **http-client.ts** - Base HTTP client with Axios

## How to Generate Types

### Automatic Generation on Dev Start

Types are **automatically generated** when you start the development servers:

```bash
npm run dev  # Generates types, then starts backend and frontend
```

### Manual Generation

#### From Project Root

```bash
npm run generate:types
```

#### From Backend Package

```bash
cd packages/backend
npm run generate:types
```

### Manual Steps

1. Generate Swagger JSON from TypeScript definition:
   ```bash
   npm run generate:swagger
   ```

2. Generate TypeScript types from Swagger JSON:
   ```bash
   swagger-typescript-api generate -p ./swagger.json -o ../frontend/src/api/generated -n index.ts --modular --axios
   ```

## Usage in Frontend

### Import Generated Types

```typescript
import { User, Product, Order, CreateUserRequest } from '../api';
```

### Use API Client

```typescript
import { usersApi, productsApi, ordersApi } from '../api';

// Get all users
const response = await usersApi.getAll();
const users = response.data;

// Create new user
await usersApi.create({ name: 'John', email: 'john@example.com', role: 'user' });
```

### With React Query

```typescript
const { data: usersResponse } = useQuery({
  queryKey: ['users'],
  queryFn: usersApi.getAll,
});

const users = usersResponse?.data;
```

## Workflow

1. **Update Backend Schema** - Modify Zod schemas in `packages/backend/src/schemas/`
2. **Update Swagger Definition** - Update `packages/backend/src/swagger.ts` to reflect schema changes
3. **Types Auto-Generated** - Types regenerate automatically on `npm run dev`, or manually run `npm run generate:types`
4. **Use in Frontend** - Import and use generated types in components

## Single Source of Truth

The **Swagger specification** (`swagger.ts`) is the single source of truth for types. This ensures:

- ✅ Frontend and backend always in sync
- ✅ No manual type duplication
- ✅ Automatic API client generation
- ✅ Type-safe API calls
- ✅ Compile-time error detection

## Files Structure

```
packages/
├── backend/
│   ├── src/
│   │   ├── swagger.ts              # OpenAPI 3.0 specification (source of truth)
│   │   ├── generateSwagger.ts      # Generates swagger.json
│   │   └── schemas/                # Zod validation schemas
│   └── swagger.json                # Generated Swagger JSON
└── frontend/
    └── src/
        └── api/
            ├── generated/          # Auto-generated (DO NOT EDIT)
            │   ├── data-contracts.ts
            │   ├── Api.ts
            │   └── http-client.ts
            └── index.ts            # Convenience exports
```

## Configuration

### swagger-typescript-api Options

The generator is configured with the following options:

- `--modular` - Generate modular code (separate files)
- `--axios` - Use Axios for HTTP requests
- `--extract-request-params` - Extract request parameters
- `--extract-request-body` - Extract request body types
- `--extract-response-body` - Extract response body types
- `--extract-response-error` - Extract error response types

## Notes

- **Do NOT edit generated files** - They will be overwritten on next generation
- Generated files have `@ts-nocheck` to avoid strict linting
- Frontend API wrapper (`api/index.ts`) provides convenience methods
- Backend Swagger spec includes descriptions, examples, and validation rules
