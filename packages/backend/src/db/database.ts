import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/app.db');
export const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Products table
  db.exec(`
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✅ Database schema initialized');
}

// Seed initial data if tables are empty
export function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  
  if (userCount.count === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, role)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((users: any[]) => {
      for (const user of users) insertUser.run(user.id, user.name, user.email, user.role);
    });

    insertMany([
      { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user' },
    ]);

    console.log('✅ Users seeded');
  }

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  
  if (productCount.count === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (id, name, description, price, in_stock)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((products: any[]) => {
      for (const product of products) {
        insertProduct.run(product.id, product.name, product.description, product.price, product.inStock ? 1 : 0);
      }
    });

    insertMany([
      { id: '1', name: 'Laptop', description: 'Powerful laptop for development', price: 2500, inStock: true },
      { id: '2', name: 'Keyboard', description: 'Mechanical keyboard', price: 150, inStock: true },
      { id: '3', name: 'Monitor', description: '27" 4K monitor', price: 800, inStock: false },
    ]);

    console.log('✅ Products seeded');
  }

  const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
  
  if (orderCount.count === 0) {
    const insertOrder = db.prepare(`
      INSERT INTO orders (id, customer_id, product_id, quantity, total, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((orders: any[]) => {
      for (const order of orders) {
        insertOrder.run(order.id, order.customerId, order.productId, order.quantity, order.total, order.status);
      }
    });

    insertMany([
      { id: '1', customerId: '1', productId: '1', quantity: 1, total: 2500, status: 'completed' },
      { id: '2', customerId: '2', productId: '2', quantity: 2, total: 300, status: 'pending' },
    ]);

    console.log('✅ Orders seeded');
  }
}
