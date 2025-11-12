import { Router } from 'express';
import { CreateUserSchema } from '../schemas/user';
import { RepositoryFactory } from '../repositories/RepositoryFactory';

export const usersRouter = Router();

const userRepository = RepositoryFactory.getUserRepository();

// GET /api/users
usersRouter.get('/', (req, res) => {
  const users = userRepository.findAll();
  res.json(users);
});

// GET /api/users/:id
usersRouter.get('/:id', (req, res) => {
  const user = userRepository.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

// POST /api/users
usersRouter.post('/', (req, res) => {
  try {
    const body = CreateUserSchema.parse(req.body);
    const newUser = userRepository.create(body);
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' });
  }
});
