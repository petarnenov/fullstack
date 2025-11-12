import { Router } from 'express';
import { CreateProductSchema } from '../schemas/product';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

export const productsRouter = Router();

const productRepository = RepositoryFactory.getProductRepository();

// GET /api/products
productsRouter.get('/', (req, res) => {
  const products = productRepository.findAll();
  res.json(products);
});

// GET /api/products/:id
productsRouter.get('/:id', (req, res) => {
  const product = productRepository.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST /api/products
productsRouter.post('/', (req, res) => {
  try {
    const body = CreateProductSchema.parse(req.body);
    const newProduct = productRepository.create(body);
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});
