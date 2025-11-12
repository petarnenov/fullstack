import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerDocument } from './swagger';
import { usersRouter } from './routes/users';
import { productsRouter } from './routes/products';
import { ordersRouter } from './routes/orders';
import { initializeDatabase, seedDatabase } from './db/database';
import { initializeTestDatabase, seedTestDatabase } from './db/testDatabase';
import { RepositoryFactory } from './repositories/RepositoryFactory';

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database based on environment
if (process.env.NODE_ENV === 'test') {
  console.log('🧪 Initializing test SQLite database (in-memory)...');
  initializeTestDatabase();
  seedTestDatabase();
  console.log('✅ Test database initialized and seeded');
} else if (process.env.USE_SQLITE === 'true') {
  console.log('🗄️  Initializing SQLite database...');
  initializeDatabase();
  seedDatabase();
  console.log('✅ Database initialized and seeded');
} else {
  console.log('💾 Using in-memory data storage');
}

console.log(`📦 Repository type: ${RepositoryFactory.getRepositoryType()}`);

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Routes
app.use('/api/users', usersRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📚 Swagger UI available at http://localhost:${PORT}/api-docs`);
});
