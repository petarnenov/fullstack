import { Router } from 'express';
import { CreateOrderSchema } from '../schemas/order';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

export const ordersRouter = Router();

const orderRepository = RepositoryFactory.getOrderRepository();

// GET /api/orders
ordersRouter.get('/', (req, res) => {
  const orders = orderRepository.findAll();
  res.json(orders);
});

// GET /api/orders/:id
ordersRouter.get('/:id', (req, res) => {
  const order = orderRepository.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

// POST /api/orders
ordersRouter.post('/', (req, res) => {
  try {
    const body = CreateOrderSchema.parse(req.body);
    const newOrder = orderRepository.create(body);
    res.status(201).json(newOrder);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});
