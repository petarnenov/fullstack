# Test Database Documentation

## Overview

The test database uses **SQLite in-memory** (`:memory:`) for isolated, fast testing. Unlike the development SQLite database which persists to disk, the test database exists only in RAM and is completely destroyed when the connection closes.

## Key Features

- ✅ **In-Memory**: No file I/O, extremely fast
- ✅ **Isolated**: Each test run starts fresh
- ✅ **Same Schema**: Identical to production database
- ✅ **Independent**: Separate from dev in-memory and dev SQLite

## Architecture

### Three Database Options

1. **In-Memory (default dev)**
   - Type: JavaScript arrays
   - Persistence: None
   - Use: Quick development
   - Enable: `USE_SQLITE=false` (default)

2. **SQLite File (production dev)**
   - Type: SQLite with file storage
   - Persistence: Disk (`data/app.db`)
   - Use: Production-like development
   - Enable: `USE_SQLITE=true`

3. **SQLite In-Memory Test (testing)**
   - Type: SQLite in-memory (`:memory:`)
   - Persistence: None (RAM only)
   - Use: Automated tests
   - Enable: `NODE_ENV=test`

## Repository Implementation

### Test Repositories
Located in `repositories/test/`:
- `TestSqliteUserRepository`
- `TestSqliteProductRepository`
- `TestSqliteOrderRepository`

All use `testDb` from `db/testDatabase.ts` instead of `db` from `db/database.ts`.

## Database Functions

### `initializeTestDatabase()`
Creates schema in test database (`:memory:`).

### `seedTestDatabase()`
Populates test database with sample data:
- 2 test users (`test-1`, `test-2`)
- 2 test products (`test-p1`, `test-p2`)
- 2 test orders (`test-o1`, `test-o2`)

### `clearTestDatabase()`
Deletes all data from test database. Useful between test cases.

### `closeTestDatabase()`
Closes the test database connection. Memory is freed.

## Usage in Tests

```typescript
import { 
  initializeTestDatabase, 
  seedTestDatabase, 
  clearTestDatabase,
  closeTestDatabase 
} from '../db/testDatabase';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

describe('My Tests', () => {
  beforeEach(() => {
    // Set repository to test mode
    RepositoryFactory.setRepositoryType('test');
    
    // Initialize and seed fresh data
    initializeTestDatabase();
    clearTestDatabase();
    seedTestDatabase();
  });

  afterAll(() => {
    // Close database connection
    closeTestDatabase();
  });

  it('should test something', () => {
    const userRepo = RepositoryFactory.getUserRepository();
    const users = userRepo.findAll();
    expect(users).toHaveLength(2);
  });
});
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test repositories.test.ts
```

## Environment Detection

The `RepositoryFactory` automatically detects test mode:

```typescript
private static repositoryType: RepositoryType = 
  process.env.NODE_ENV === 'test' ? 'test' :      // Test in-memory SQLite
  process.env.USE_SQLITE === 'true' ? 'sqlite' :  // Dev SQLite file
  'memory';                                        // Dev in-memory arrays
```

## Test Data

### Users
```typescript
{ id: 'test-1', name: 'Test User', email: 'test@example.com', role: 'user' }
{ id: 'test-2', name: 'Test Admin', email: 'admin@example.com', role: 'admin' }
```

### Products
```typescript
{ id: 'test-p1', name: 'Test Product 1', price: 100, inStock: true }
{ id: 'test-p2', name: 'Test Product 2', price: 200, inStock: false }
```

### Orders
```typescript
{ id: 'test-o1', customerId: 'test-1', productId: 'test-p1', quantity: 1, total: 100 }
{ id: 'test-o2', customerId: 'test-2', productId: 'test-p2', quantity: 2, total: 400 }
```

## Benefits

### Speed
In-memory SQLite is **faster** than file-based SQLite because:
- No disk I/O
- No file locking
- Pure RAM operations

### Isolation
Each test run gets a **fresh database**:
- No leftover data from previous tests
- No conflicts between test runs
- Predictable state

### Realism
Uses **real SQLite** (not mocks):
- Tests actual SQL queries
- Validates foreign key constraints
- Catches SQL errors

## Comparison

| Feature | In-Memory Arrays | SQLite File | SQLite In-Memory Test |
|---------|------------------|-------------|----------------------|
| Speed | ⚡⚡⚡ Fastest | 🐌 Slower | ⚡⚡ Very Fast |
| Persistence | ❌ None | ✅ Disk | ❌ None |
| SQL Testing | ❌ No SQL | ✅ Real SQL | ✅ Real SQL |
| Isolation | ⚠️ Shared state | ⚠️ Shared file | ✅ Per-connection |
| Use Case | Quick dev | Production-like | Automated tests |

## Best Practices

### 1. Always Clear Between Tests
```typescript
beforeEach(() => {
  clearTestDatabase();
  seedTestDatabase();
});
```

### 2. Close After All Tests
```typescript
afterAll(() => {
  closeTestDatabase();
});
```

### 3. Use Test-Specific IDs
Test data uses `test-` prefix to avoid ID collisions:
- Users: `test-1`, `test-2`
- Products: `test-p1`, `test-p2`
- Orders: `test-o1`, `test-o2`

### 4. Set Repository Type Explicitly
```typescript
RepositoryFactory.setRepositoryType('test');
```

Even though `NODE_ENV=test` auto-detects, explicit is better.

## Troubleshooting

### "Database is locked"
Not possible with `:memory:` - each connection has its own database.

### "Table already exists"
Call `clearTestDatabase()` in `beforeEach`.

### Tests affecting each other
Make sure you're calling `clearTestDatabase()` between tests.

### "Cannot find module @jest/globals"
Run: `npm install --save-dev jest @jest/globals @types/jest ts-jest`

## Example Test Suite

See `src/__tests__/repositories.test.ts` for complete examples:
- User CRUD operations
- Product boolean conversion
- Order total calculation
- Error handling
- Validation tests
