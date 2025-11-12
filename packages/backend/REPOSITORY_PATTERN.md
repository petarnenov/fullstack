# Repository Pattern Documentation

## Overview

This project uses the **Repository Pattern** to provide clean separation between data access logic and business logic. This allows switching between different data storage implementations (in-memory or SQLite) without changing route handlers.

## Architecture

### Interface Layer
Repository interfaces define the contract that all implementations must follow:
- `IUserRepository`
- `IProductRepository`
- `IOrderRepository`

Each interface provides standard CRUD operations:
```typescript
interface IUserRepository {
  findAll(): User[];
  findById(id: string): User | undefined;
  create(data: CreateUserRequest): User;
  update(id: string, data: Partial<User>): User | undefined;
  delete(id: string): boolean;
}
```

### Implementation Layer

#### In-Memory Implementations
Located in `repositories/memory/`:
- `InMemoryUserRepository`
- `InMemoryProductRepository`
- `InMemoryOrderRepository`

These use JavaScript arrays to store data in memory. Data is lost when the server restarts.

#### SQLite Implementations
Located in `repositories/sqlite/`:
- `SqliteUserRepository`
- `SqliteProductRepository`
- `SqliteOrderRepository`

These use SQLite database for persistent storage. Features:
- Prepared statements for SQL injection protection
- Type-safe mapping between database and TypeScript types
- Automatic database initialization and seeding
- Foreign key constraints

### Factory Pattern
`RepositoryFactory` provides a single point to get repository instances:

```typescript
const userRepository = RepositoryFactory.getUserRepository();
const productRepository = RepositoryFactory.getProductRepository();
const orderRepository = RepositoryFactory.getOrderRepository();
```

## Configuration

### Environment Variable
Set `USE_SQLITE` in `.env` file:

```bash
# Use in-memory storage (default)
USE_SQLITE=false

# Use SQLite database
USE_SQLITE=true
```

### Switching Implementations

1. **Development (in-memory)**:
   ```bash
   USE_SQLITE=false npm run dev
   ```
   - Fast startup
   - No persistence
   - Good for testing

2. **Production (SQLite)**:
   ```bash
   USE_SQLITE=true npm run dev
   ```
   - Data persists across restarts
   - Better for production use
   - Supports concurrent access

## Database Schema

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Products Table
```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  in_stock INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### Orders Table
```sql
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  total_price REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
)
```

## Type Mapping

### Boolean Fields
SQLite doesn't have native boolean type. We use INTEGER (0/1):

```typescript
// Database → TypeScript
inStock: row.in_stock === 1

// TypeScript → Database
in_stock: inStock ? 1 : 0
```

### Field Name Conversion
Database uses snake_case, TypeScript uses camelCase:

```typescript
// Database: customer_id, product_id, total_price, in_stock, created_at
// TypeScript: customerId, productId, totalPrice, inStock, createdAt
```

## Best Practices

### 1. **Always use repository methods**
Never access database directly from routes:
```typescript
// ❌ Bad
const user = users.find(u => u.id === id);

// ✅ Good
const user = userRepository.findById(id);
```

### 2. **Use prepared statements**
All SQLite repositories use prepared statements:
```typescript
const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
const user = stmt.get(id);
```

### 3. **Handle errors gracefully**
```typescript
try {
  const order = orderRepository.create(data);
  res.status(201).json(order);
} catch (error) {
  res.status(400).json({ error: 'Invalid data' });
}
```

### 4. **Maintain interface contract**
Both in-memory and SQLite implementations must implement the same interface to ensure they can be swapped.

## Testing Both Implementations

### Test In-Memory
```bash
USE_SQLITE=false npm run dev
```
Make API requests, restart server, verify data is lost.

### Test SQLite
```bash
USE_SQLITE=true npm run dev
```
Make API requests, restart server, verify data persists.

### Verify Switching
```bash
# Start with in-memory
USE_SQLITE=false npm run dev
# Create some data via API
# Stop server

# Start with SQLite
USE_SQLITE=true npm run dev
# Verify new database is seeded with initial data
```

## Adding New Repository

To add a new entity (e.g., Categories):

1. Create schema: `schemas/category.ts`
2. Create interface: `repositories/interfaces/ICategoryRepository.ts`
3. Create in-memory implementation: `repositories/memory/InMemoryCategoryRepository.ts`
4. Create SQLite implementation: `repositories/sqlite/SqliteCategoryRepository.ts`
5. Add to factory: `RepositoryFactory.getCategoryRepository()`
6. Create route: `routes/categories.ts`
7. Add to index.ts

## Troubleshooting

### Database locked error
SQLite is in use by another process. Stop all backend instances.

### Foreign key constraint failed
Ensure referenced records exist before creating relationships:
```typescript
// Check user exists before creating order
const user = userRepository.findById(customerId);
if (!user) throw new Error('User not found');
```

### Type mismatch errors
Verify field name mapping between database (snake_case) and TypeScript (camelCase).

## Performance Considerations

### In-Memory
- ✅ Extremely fast
- ✅ No disk I/O
- ❌ Limited by RAM
- ❌ Data loss on restart

### SQLite
- ✅ Persistent storage
- ✅ ACID transactions
- ✅ Good for < 100k records
- ⚠️ Single-writer limitation
- ⚠️ Disk I/O overhead

## Migration Path

For production at scale, consider migrating to PostgreSQL/MySQL:

1. Implement `PostgresUserRepository` using same interface
2. Add to factory with `USE_POSTGRES` env var
3. No route changes needed due to interface abstraction

This repository pattern makes such migrations seamless.
