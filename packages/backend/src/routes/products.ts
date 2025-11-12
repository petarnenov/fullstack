import { Router } from 'express';
import { Product, CreateProductRequest, ProductSchema, CreateProductSchema } from '../schemas/product';

export const productsRouter = Router();

// In-memory database
const products: Product[] = [
  { id: '1', name: 'Laptop', description: 'Powerful laptop for development', price: 2500, inStock: true },
  { id: '2', name: 'Keyboard', description: 'Mechanical keyboard', price: 150, inStock: true },
  { id: '3', name: 'Monitor', description: '27" 4K monitor', price: 800, inStock: false },
];

let nextId = 4;

// GET /api/products
productsRouter.get('/', (req, res) => {
  res.json(products);
});

// GET /api/products/:id
productsRouter.get('/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST /api/products
productsRouter.post('/', (req, res) => {
  try {
    const body = CreateProductSchema.parse(req.body);
    const newProduct: Product = {
      id: String(nextId++),
      ...body,
      inStock: body.inStock !== undefined ? body.inStock : true,
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});
