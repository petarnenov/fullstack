import { Router } from 'express';
import { Order, CreateOrderSchema } from '../schemas/order';

export const ordersRouter = Router();

// In-memory database
const orders: Order[] = [
  { id: '1', customerId: '1', productId: '1', quantity: 1, total: 2500, status: 'completed' },
  { id: '2', customerId: '2', productId: '2', quantity: 2, total: 300, status: 'pending' },
];

let nextId = 3;

// GET /api/orders
ordersRouter.get('/', (req, res) => {
  res.json(orders);
});

// GET /api/orders/:id
ordersRouter.get('/:id', (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// POST /api/orders
ordersRouter.post('/', (req, res) => {
  try {
    const body = CreateOrderSchema.parse(req.body);
    // Here we should get the price from the product, but for simplicity we calculate it directly
    const newOrder: Order = {
      id: String(nextId++),
      ...body,
      total: body.quantity * 100, // Example price
      status: 'pending',
    };
    orders.push(newOrder);
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});
