import Database from 'better-sqlite3';

// In-memory database for testing (data lost when connection closes)
export const testDb = new Database(':memory:');

// Enable foreign keys
testDb.pragma('foreign_keys = ON');

// Initialize test database schema
export function initializeTestDatabase() {
  // Users table
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      in_stock INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Orders table
  testDb.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      total_price REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES users(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  console.log('✅ Test database schema initialized');
}

// Seed test data
export function seedTestDatabase() {
  const userCount = testDb.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const insertUser = testDb.prepare(`
      INSERT INTO users (id, name, email, role)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = testDb.transaction((users: any[]) => {
      for (const user of users) insertUser.run(user.id, user.name, user.email, user.role);
    });

    insertMany([
      { id: 'test-1', name: 'Test User', email: 'test@example.com', role: 'user' },
      { id: 'test-2', name: 'Test Admin', email: 'admin@example.com', role: 'admin' },
    ]);

    console.log('✅ Test users seeded');
  }

  const productCount = testDb.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  
  if (productCount.count === 0) {
    const insertProduct = testDb.prepare(`
      INSERT INTO products (id, name, description, price, in_stock)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = testDb.transaction((products: any[]) => {
      for (const product of products) {
        insertProduct.run(product.id, product.name, product.description, product.price, product.inStock ? 1 : 0);
      }
    });

    insertMany([
      { id: 'test-p1', name: 'Test Product 1', description: 'Test description', price: 100, inStock: true },
      { id: 'test-p2', name: 'Test Product 2', description: 'Another test', price: 200, inStock: false },
    ]);

    console.log('✅ Test products seeded');
  }

  const orderCount = testDb.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  
  if (orderCount.count === 0) {
    const insertOrder = testDb.prepare(`
      INSERT INTO orders (id, customer_id, product_id, quantity, total_price)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = testDb.transaction((orders: any[]) => {
      for (const order of orders) {
        insertOrder.run(order.id, order.customerId, order.productId, order.quantity, order.total);
      }
    });

    insertMany([
      { id: 'test-o1', customerId: 'test-1', productId: 'test-p1', quantity: 1, total: 100 },
      { id: 'test-o2', customerId: 'test-2', productId: 'test-p2', quantity: 2, total: 400 },
    ]);

    console.log('✅ Test orders seeded');
  }
}

// Clear all test data (useful between tests)
export function clearTestDatabase() {
  testDb.exec('DELETE FROM orders');
  testDb.exec('DELETE FROM products');
  testDb.exec('DELETE FROM users');
  console.log('✅ Test database cleared');
}

// Close test database connection
export function closeTestDatabase() {
  testDb.close();
  console.log('✅ Test database closed');
}
